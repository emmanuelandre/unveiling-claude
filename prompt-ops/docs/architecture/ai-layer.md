# AI Layer Architecture

## Overview

The AI layer handles LLM orchestration via LangGraph, model provider integration, prompt execution, and evaluation. It's implemented as a Python service that communicates with the Go API via gRPC.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AI LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         gRPC Server                                    │  │
│  │  ExecutePrompt | ExecuteWorkflow | Evaluate | StreamResponse          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│         ┌────────────────────────────┼────────────────────────────┐         │
│         │                            │                            │         │
│         ▼                            ▼                            ▼         │
│  ┌─────────────┐            ┌─────────────┐            ┌─────────────┐     │
│  │  LangGraph  │            │  Provider   │            │ Evaluation  │     │
│  │  Executor   │            │   Router    │            │   Engine    │     │
│  └──────┬──────┘            └──────┬──────┘            └──────┬──────┘     │
│         │                          │                          │            │
│         │    ┌─────────────────────┼─────────────────────┐   │            │
│         │    │                     │                     │   │            │
│         │    ▼                     ▼                     ▼   │            │
│         │  ┌─────────┐      ┌─────────┐      ┌─────────┐    │            │
│         │  │ OpenAI  │      │Anthropic│      │HuggingFace│   │            │
│         │  │ Adapter │      │ Adapter │      │ Adapter │    │            │
│         │  └─────────┘      └─────────┘      └─────────┘    │            │
│         │                                                    │            │
│         │  ┌──────────────────────────────────────────────┐ │            │
│         └─▶│              LangGraph Runtime               │◀┘            │
│            │  Nodes | Edges | State | Checkpoints         │              │
│            └──────────────────────────────────────────────┘              │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
ai-service/
├── app/
│   ├── main.py                    # Service entry point
│   ├── grpc/
│   │   ├── server.py              # gRPC server setup
│   │   └── handlers.py            # Request handlers
│   ├── langgraph/
│   │   ├── executor.py            # Workflow execution
│   │   ├── nodes/
│   │   │   ├── prompt_node.py
│   │   │   ├── condition_node.py
│   │   │   ├── loop_node.py
│   │   │   └── tool_node.py
│   │   └── state.py               # Graph state management
│   ├── providers/
│   │   ├── base.py                # Provider interface
│   │   ├── openai_provider.py
│   │   ├── anthropic_provider.py
│   │   └── huggingface_provider.py
│   ├── evaluation/
│   │   ├── engine.py              # Evaluation orchestration
│   │   ├── metrics/
│   │   │   ├── bleu.py
│   │   │   ├── rouge.py
│   │   │   └── semantic.py
│   │   └── datasets.py            # Ground truth management
│   └── utils/
│       ├── tokenizer.py           # Token counting
│       └── streaming.py           # Stream utilities
├── proto/
│   └── ai_service.proto           # gRPC definitions
├── tests/
├── requirements.txt
└── Dockerfile
```

## LangGraph Integration

### Graph Definition

```python
# app/langgraph/executor.py
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated

class WorkflowState(TypedDict):
    input: str
    messages: list[dict]
    current_output: str
    variables: dict
    iteration: int

class WorkflowExecutor:
    def __init__(self, provider_router: ProviderRouter):
        self.provider_router = provider_router

    def build_graph(self, workflow_config: dict) -> StateGraph:
        """Build a LangGraph from workflow configuration."""
        graph = StateGraph(WorkflowState)

        # Add nodes from config
        for node_config in workflow_config["nodes"]:
            node_type = node_config["type"]
            node_id = node_config["id"]

            if node_type == "prompt":
                graph.add_node(node_id, self._create_prompt_node(node_config))
            elif node_type == "condition":
                graph.add_node(node_id, self._create_condition_node(node_config))
            elif node_type == "loop":
                graph.add_node(node_id, self._create_loop_node(node_config))
            elif node_type == "tool":
                graph.add_node(node_id, self._create_tool_node(node_config))

        # Add edges from config
        for edge in workflow_config["edges"]:
            if edge.get("conditional"):
                graph.add_conditional_edges(
                    edge["source"],
                    self._create_router(edge),
                    edge["targets"]
                )
            else:
                graph.add_edge(edge["source"], edge["target"])

        # Set entry and exit points
        graph.set_entry_point(workflow_config["entrypoint"])
        graph.add_edge(workflow_config["exitpoint"], END)

        return graph.compile()

    def _create_prompt_node(self, config: dict):
        """Create a prompt execution node."""
        async def prompt_node(state: WorkflowState) -> WorkflowState:
            prompt_template = config["data"]["content"]
            model_id = config["data"]["model_id"]

            # Interpolate variables
            prompt = self._interpolate(prompt_template, state["variables"])

            # Get provider and execute
            provider = self.provider_router.get_provider(model_id)
            response = await provider.complete(
                messages=[{"role": "user", "content": prompt}],
                stream=False
            )

            # Update state
            state["current_output"] = response.content
            state["messages"].append({
                "role": "assistant",
                "content": response.content,
                "node_id": config["id"]
            })

            return state

        return prompt_node
```

### Streaming Execution

```python
# app/langgraph/executor.py
async def execute_with_streaming(
    self,
    workflow_config: dict,
    initial_state: WorkflowState,
    callback: Callable[[str], None]
) -> WorkflowState:
    """Execute workflow with streaming token output."""
    graph = self.build_graph(workflow_config)

    # Configure streaming callback
    config = {
        "callbacks": [StreamingCallback(callback)],
        "recursion_limit": 50
    }

    # Execute graph
    final_state = await graph.ainvoke(initial_state, config)

    return final_state

class StreamingCallback:
    def __init__(self, callback: Callable[[str], None]):
        self.callback = callback

    async def on_llm_new_token(self, token: str, **kwargs):
        await self.callback(token)
```

## Provider Integration

### Provider Interface

```python
# app/providers/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncGenerator

@dataclass
class CompletionResponse:
    content: str
    tokens_input: int
    tokens_output: int
    model: str
    latency_ms: int

@dataclass
class StreamChunk:
    content: str
    is_done: bool

class LLMProvider(ABC):
    @abstractmethod
    async def complete(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False
    ) -> CompletionResponse | AsyncGenerator[StreamChunk, None]:
        pass

    @abstractmethod
    def count_tokens(self, text: str) -> int:
        pass

    @abstractmethod
    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        pass
```

### OpenAI Provider

```python
# app/providers/openai_provider.py
from openai import AsyncOpenAI
import tiktoken

class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)
        self.tokenizer = tiktoken.get_encoding("cl100k_base")

    # Model pricing per 1M tokens
    PRICING = {
        "gpt-4o": {"input": 2.50, "output": 10.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "gpt-4-turbo": {"input": 10.00, "output": 30.00},
    }

    async def complete(
        self,
        messages: list[dict],
        model: str = "gpt-4o",
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False
    ):
        start_time = time.time()

        if stream:
            return self._stream_complete(messages, model, temperature, max_tokens)

        response = await self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )

        latency_ms = int((time.time() - start_time) * 1000)

        return CompletionResponse(
            content=response.choices[0].message.content,
            tokens_input=response.usage.prompt_tokens,
            tokens_output=response.usage.completion_tokens,
            model=model,
            latency_ms=latency_ms
        )

    async def _stream_complete(
        self,
        messages: list[dict],
        model: str,
        temperature: float,
        max_tokens: int
    ) -> AsyncGenerator[StreamChunk, None]:
        stream = await self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield StreamChunk(
                    content=chunk.choices[0].delta.content,
                    is_done=False
                )

        yield StreamChunk(content="", is_done=True)

    def count_tokens(self, text: str) -> int:
        return len(self.tokenizer.encode(text))

    def estimate_cost(self, input_tokens: int, output_tokens: int, model: str = "gpt-4o") -> float:
        pricing = self.PRICING.get(model, self.PRICING["gpt-4o"])
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost
```

### Anthropic Provider

```python
# app/providers/anthropic_provider.py
from anthropic import AsyncAnthropic

class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str):
        self.client = AsyncAnthropic(api_key=api_key)

    PRICING = {
        "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
        "claude-3-opus-20240229": {"input": 15.00, "output": 75.00},
        "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},
    }

    async def complete(
        self,
        messages: list[dict],
        model: str = "claude-3-5-sonnet-20241022",
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False
    ):
        start_time = time.time()

        if stream:
            return self._stream_complete(messages, model, temperature, max_tokens)

        # Convert messages to Anthropic format
        system = next((m["content"] for m in messages if m["role"] == "system"), None)
        anthropic_messages = [m for m in messages if m["role"] != "system"]

        response = await self.client.messages.create(
            model=model,
            messages=anthropic_messages,
            system=system,
            temperature=temperature,
            max_tokens=max_tokens
        )

        latency_ms = int((time.time() - start_time) * 1000)

        return CompletionResponse(
            content=response.content[0].text,
            tokens_input=response.usage.input_tokens,
            tokens_output=response.usage.output_tokens,
            model=model,
            latency_ms=latency_ms
        )
```

### Provider Router

```python
# app/providers/router.py
class ProviderRouter:
    def __init__(self, config: dict):
        self.providers = {}
        self._init_providers(config)

    def _init_providers(self, config: dict):
        if config.get("openai_api_key"):
            self.providers["openai"] = OpenAIProvider(config["openai_api_key"])
        if config.get("anthropic_api_key"):
            self.providers["anthropic"] = AnthropicProvider(config["anthropic_api_key"])
        if config.get("huggingface_api_key"):
            self.providers["huggingface"] = HuggingFaceProvider(config["huggingface_api_key"])

    def get_provider(self, model_id: str) -> LLMProvider:
        """Route to appropriate provider based on model ID."""
        if model_id.startswith("gpt-"):
            return self.providers["openai"]
        elif model_id.startswith("claude-"):
            return self.providers["anthropic"]
        elif model_id.startswith("hf-"):
            return self.providers["huggingface"]
        else:
            raise ValueError(f"Unknown model: {model_id}")
```

## Evaluation Engine

### Metrics Implementation

```python
# app/evaluation/metrics/bleu.py
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction

def calculate_bleu(reference: str, hypothesis: str) -> float:
    """Calculate BLEU score between reference and hypothesis."""
    reference_tokens = reference.lower().split()
    hypothesis_tokens = hypothesis.lower().split()

    smoothing = SmoothingFunction().method1
    score = sentence_bleu(
        [reference_tokens],
        hypothesis_tokens,
        smoothing_function=smoothing
    )

    return score
```

```python
# app/evaluation/metrics/rouge.py
from rouge_score import rouge_scorer

def calculate_rouge(reference: str, hypothesis: str) -> dict:
    """Calculate ROUGE scores."""
    scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)
    scores = scorer.score(reference, hypothesis)

    return {
        "rouge1": scores["rouge1"].fmeasure,
        "rouge2": scores["rouge2"].fmeasure,
        "rougeL": scores["rougeL"].fmeasure
    }
```

```python
# app/evaluation/metrics/semantic.py
from sentence_transformers import SentenceTransformer
import numpy as np

class SemanticSimilarity:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)

    def calculate(self, reference: str, hypothesis: str) -> float:
        """Calculate cosine similarity between embeddings."""
        embeddings = self.model.encode([reference, hypothesis])
        similarity = np.dot(embeddings[0], embeddings[1]) / (
            np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])
        )
        return float(similarity)
```

### Evaluation Engine

```python
# app/evaluation/engine.py
@dataclass
class EvaluationResult:
    prompt_id: str
    execution_id: str
    metrics: dict
    timestamp: datetime

class EvaluationEngine:
    def __init__(self):
        self.semantic = SemanticSimilarity()

    async def evaluate(
        self,
        output: str,
        reference: str | None = None,
        metrics: list[str] = ["bleu", "rouge", "semantic"]
    ) -> EvaluationResult:
        """Evaluate model output against reference."""
        results = {}

        if reference:
            if "bleu" in metrics:
                results["bleu"] = calculate_bleu(reference, output)

            if "rouge" in metrics:
                rouge_scores = calculate_rouge(reference, output)
                results.update(rouge_scores)

            if "semantic" in metrics:
                results["semantic_similarity"] = self.semantic.calculate(reference, output)

        return EvaluationResult(
            prompt_id=...,
            execution_id=...,
            metrics=results,
            timestamp=datetime.utcnow()
        )

    async def batch_evaluate(
        self,
        outputs: list[str],
        references: list[str],
        metrics: list[str]
    ) -> list[EvaluationResult]:
        """Batch evaluate multiple outputs."""
        tasks = [
            self.evaluate(output, reference, metrics)
            for output, reference in zip(outputs, references)
        ]
        return await asyncio.gather(*tasks)
```

## gRPC Interface

### Proto Definition

```protobuf
// proto/ai_service.proto
syntax = "proto3";

package promptops.ai;

service AIService {
  rpc ExecutePrompt(ExecutePromptRequest) returns (stream ExecutePromptResponse);
  rpc ExecuteWorkflow(ExecuteWorkflowRequest) returns (stream ExecuteWorkflowResponse);
  rpc Evaluate(EvaluateRequest) returns (EvaluateResponse);
  rpc CountTokens(CountTokensRequest) returns (CountTokensResponse);
}

message ExecutePromptRequest {
  string prompt_id = 1;
  string model_id = 2;
  map<string, string> variables = 3;
  bool stream = 4;
}

message ExecutePromptResponse {
  oneof response {
    string token = 1;
    ExecutionResult result = 2;
  }
}

message ExecutionResult {
  string output = 1;
  int32 tokens_input = 2;
  int32 tokens_output = 3;
  int32 latency_ms = 4;
  string error = 5;
}

message ExecuteWorkflowRequest {
  string workflow_id = 1;
  map<string, string> input = 2;
  bool stream = 3;
}

message ExecuteWorkflowResponse {
  string node_id = 1;
  string status = 2;  // running, completed, failed
  oneof output {
    string token = 3;
    string result = 4;
  }
}

message EvaluateRequest {
  string output = 1;
  string reference = 2;
  repeated string metrics = 3;
}

message EvaluateResponse {
  map<string, float> scores = 1;
}

message CountTokensRequest {
  string text = 1;
  string model = 2;
}

message CountTokensResponse {
  int32 count = 1;
}
```

## Error Handling

```python
# app/utils/errors.py
class AIServiceError(Exception):
    """Base exception for AI service."""
    pass

class ProviderError(AIServiceError):
    """Error from LLM provider."""
    def __init__(self, provider: str, message: str, status_code: int = None):
        self.provider = provider
        self.status_code = status_code
        super().__init__(f"[{provider}] {message}")

class RateLimitError(ProviderError):
    """Rate limit exceeded."""
    pass

class TokenLimitError(AIServiceError):
    """Token limit exceeded."""
    pass

class WorkflowError(AIServiceError):
    """Error in workflow execution."""
    def __init__(self, node_id: str, message: str):
        self.node_id = node_id
        super().__init__(f"[Node: {node_id}] {message}")
```

## Retry Logic

```python
# app/utils/retry.py
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((ProviderError, asyncio.TimeoutError)),
    before_sleep=lambda retry_state: logger.warning(
        f"Retrying after {retry_state.outcome.exception()}"
    )
)
async def execute_with_retry(func, *args, **kwargs):
    return await func(*args, **kwargs)
```

## Configuration

```python
# app/config.py
from pydantic_settings import BaseSettings

class AIServiceConfig(BaseSettings):
    # gRPC
    grpc_port: int = 50051
    grpc_max_workers: int = 10

    # Providers
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    huggingface_api_key: str | None = None

    # Execution
    default_timeout_seconds: int = 60
    max_retries: int = 3
    max_concurrent_executions: int = 100

    # Evaluation
    embedding_model: str = "all-MiniLM-L6-v2"

    class Config:
        env_file = ".env"
```
