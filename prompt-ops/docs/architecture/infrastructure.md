# Infrastructure Architecture

## Overview

PromptOps runs on Kubernetes with Helm charts for deployment, using Prometheus and Grafana for observability. The infrastructure is designed for multi-tenancy, auto-scaling, and high availability.

## Kubernetes Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              KUBERNETES CLUSTER                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                           INGRESS NAMESPACE                                  │    │
│  │  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐               │    │
│  │  │ Nginx Ingress │    │ Cert-Manager  │    │   External    │               │    │
│  │  │  Controller   │    │               │    │     DNS       │               │    │
│  │  └───────────────┘    └───────────────┘    └───────────────┘               │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                          PROMPTOPS NAMESPACE                                 │    │
│  │                                                                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │    │
│  │  │   API Pod   │  │   API Pod   │  │   API Pod   │  │   API Pod   │        │    │
│  │  │  (Go/Gin)   │  │  (Go/Gin)   │  │  (Go/Gin)   │  │  (Go/Gin)   │        │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │    │
│  │                         │                                                    │    │
│  │                         │ HPA: 2-20 replicas                                │    │
│  │                         │ CPU target: 70%                                   │    │
│  │                                                                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │    │
│  │  │  AI Worker  │  │  AI Worker  │  │  AI Worker  │  │  AI Worker  │        │    │
│  │  │  (Python)   │  │  (Python)   │  │  (Python)   │  │  (Python)   │        │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │    │
│  │                         │                                                    │    │
│  │                         │ HPA: 2-50 replicas                                │    │
│  │                         │ Custom metrics: queue_depth                       │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                           DATA NAMESPACE                                     │    │
│  │                                                                              │    │
│  │  ┌─────────────────────────┐    ┌─────────────────────────┐                │    │
│  │  │      PostgreSQL         │    │         Redis           │                │    │
│  │  │  ┌───────┐ ┌───────┐   │    │  ┌───────┐ ┌───────┐   │                │    │
│  │  │  │Primary│─│Replica│   │    │  │Primary│─│Replica│   │                │    │
│  │  │  └───────┘ └───────┘   │    │  └───────┘ └───────┘   │                │    │
│  │  │  PVC: 100Gi SSD        │    │  PVC: 10Gi SSD         │                │    │
│  │  └─────────────────────────┘    └─────────────────────────┘                │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                        MONITORING NAMESPACE                                  │    │
│  │                                                                              │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────┐             │    │
│  │  │Prometheus │  │  Grafana  │  │   Tempo   │  │Alertmanager │             │    │
│  │  └───────────┘  └───────────┘  └───────────┘  └─────────────┘             │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Helm Chart Structure

```
charts/
├── promptops/
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values-production.yaml
│   ├── values-staging.yaml
│   ├── templates/
│   │   ├── _helpers.tpl
│   │   ├── api-deployment.yaml
│   │   ├── api-service.yaml
│   │   ├── api-hpa.yaml
│   │   ├── ai-worker-deployment.yaml
│   │   ├── ai-worker-hpa.yaml
│   │   ├── ingress.yaml
│   │   ├── configmap.yaml
│   │   ├── secrets.yaml
│   │   ├── serviceaccount.yaml
│   │   ├── networkpolicy.yaml
│   │   └── pdb.yaml
│   └── charts/
│       ├── postgresql/
│       └── redis/
└── monitoring/
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
        ├── prometheus/
        ├── grafana/
        └── alertmanager/
```

## Helm Values

```yaml
# charts/promptops/values.yaml

replicaCount:
  api: 3
  aiWorker: 5

image:
  api:
    repository: ghcr.io/promptops/api
    tag: latest
    pullPolicy: IfNotPresent
  aiWorker:
    repository: ghcr.io/promptops/ai-worker
    tag: latest
    pullPolicy: IfNotPresent

resources:
  api:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  aiWorker:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi

autoscaling:
  api:
    enabled: true
    minReplicas: 2
    maxReplicas: 20
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80
  aiWorker:
    enabled: true
    minReplicas: 2
    maxReplicas: 50
    metrics:
      - type: External
        external:
          metric:
            name: promptops_queue_depth
          target:
            type: AverageValue
            averageValue: "10"

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
  hosts:
    - host: api.promptops.io
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: promptops-tls
      hosts:
        - api.promptops.io

postgresql:
  enabled: true
  auth:
    postgresPassword: ""  # Use secret
    database: promptops
  primary:
    persistence:
      size: 100Gi
      storageClass: ssd
  readReplicas:
    replicaCount: 2
    persistence:
      size: 100Gi

redis:
  enabled: true
  auth:
    enabled: true
    password: ""  # Use secret
  master:
    persistence:
      size: 10Gi
  replica:
    replicaCount: 2
    persistence:
      size: 10Gi

networkPolicy:
  enabled: true

podDisruptionBudget:
  api:
    minAvailable: 2
  aiWorker:
    minAvailable: 3
```

## Kubernetes Manifests

### API Deployment

```yaml
# templates/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "promptops.fullname" . }}-api
  labels:
    {{- include "promptops.labels" . | nindent 4 }}
    app.kubernetes.io/component: api
spec:
  replicas: {{ .Values.replicaCount.api }}
  selector:
    matchLabels:
      {{- include "promptops.selectorLabels" . | nindent 6 }}
      app.kubernetes.io/component: api
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
      labels:
        {{- include "promptops.selectorLabels" . | nindent 8 }}
        app.kubernetes.io/component: api
    spec:
      serviceAccountName: {{ include "promptops.serviceAccountName" . }}
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: api
          image: "{{ .Values.image.api.repository }}:{{ .Values.image.api.tag }}"
          imagePullPolicy: {{ .Values.image.api.pullPolicy }}
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "promptops.fullname" . }}-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "promptops.fullname" . }}-secrets
                  key: redis-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: {{ include "promptops.fullname" . }}-secrets
                  key: jwt-secret
          envFrom:
            - configMapRef:
                name: {{ include "promptops.fullname" . }}-config
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            {{- toYaml .Values.resources.api | nindent 12 }}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    {{- include "promptops.selectorLabels" . | nindent 20 }}
                    app.kubernetes.io/component: api
                topologyKey: kubernetes.io/hostname
```

### Horizontal Pod Autoscaler

```yaml
# templates/api-hpa.yaml
{{- if .Values.autoscaling.api.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "promptops.fullname" . }}-api
  labels:
    {{- include "promptops.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "promptops.fullname" . }}-api
  minReplicas: {{ .Values.autoscaling.api.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.api.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.api.targetCPUUtilizationPercentage }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.api.targetMemoryUtilizationPercentage }}
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
{{- end }}
```

### Network Policy

```yaml
# templates/networkpolicy.yaml
{{- if .Values.networkPolicy.enabled }}
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ include "promptops.fullname" . }}-api
  labels:
    {{- include "promptops.labels" . | nindent 4 }}
spec:
  podSelector:
    matchLabels:
      {{- include "promptops.selectorLabels" . | nindent 6 }}
      app.kubernetes.io/component: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
    # Allow from prometheus
    - from:
        - namespaceSelector:
            matchLabels:
              name: monitoring
      ports:
        - protocol: TCP
          port: 8080
  egress:
    # Allow to PostgreSQL
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: postgresql
      ports:
        - protocol: TCP
          port: 5432
    # Allow to Redis
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: redis
      ports:
        - protocol: TCP
          port: 6379
    # Allow to AI workers (gRPC)
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/component: ai-worker
      ports:
        - protocol: TCP
          port: 50051
    # Allow DNS
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
    # Allow external LLM APIs
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443
{{- end }}
```

## Prometheus Configuration

### ServiceMonitor

```yaml
# monitoring/templates/prometheus/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: promptops-api
  labels:
    app: promptops
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: promptops
      app.kubernetes.io/component: api
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
      scrapeTimeout: 10s
```

### Alerting Rules

```yaml
# monitoring/templates/prometheus/alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: promptops-alerts
spec:
  groups:
    - name: promptops.rules
      rules:
        # High error rate
        - alert: HighErrorRate
          expr: |
            sum(rate(http_requests_total{job="promptops-api",status=~"5.."}[5m])) /
            sum(rate(http_requests_total{job="promptops-api"}[5m])) > 0.01
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: High error rate detected
            description: Error rate is above 1% for the last 5 minutes

        # High latency
        - alert: HighLatency
          expr: |
            histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job="promptops-api"}[5m])) by (le)) > 2
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: High API latency
            description: 99th percentile latency is above 2 seconds

        # Pod restarts
        - alert: PodRestarting
          expr: |
            increase(kube_pod_container_status_restarts_total{namespace="promptops"}[1h]) > 3
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: Pod restarting frequently
            description: "{{ $labels.pod }} has restarted {{ $value }} times in the last hour"

        # Queue depth too high
        - alert: HighQueueDepth
          expr: promptops_queue_depth > 100
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: Execution queue backing up
            description: Queue depth is {{ $value }}, processing may be delayed

        # Database connections exhausted
        - alert: DatabaseConnectionsHigh
          expr: |
            pg_stat_activity_count{datname="promptops"} /
            pg_settings_max_connections > 0.8
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: Database connections running high
            description: Using {{ $value | humanizePercentage }} of available connections
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yaml
name: Deploy

on:
  push:
    branches: [main]
  release:
    types: [published]

env:
  REGISTRY: ghcr.io
  API_IMAGE: ghcr.io/${{ github.repository }}/api
  AI_WORKER_IMAGE: ghcr.io/${{ github.repository }}/ai-worker

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
    steps:
      - uses: actions/checkout@v4

      - name: Set version
        id: version
        run: |
          if [[ "${{ github.event_name }}" == "release" ]]; then
            echo "version=${{ github.event.release.tag_name }}" >> $GITHUB_OUTPUT
          else
            echo "version=sha-${GITHUB_SHA::8}" >> $GITHUB_OUTPUT
          fi

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push API
        uses: docker/build-push-action@v5
        with:
          context: ./api
          push: true
          tags: |
            ${{ env.API_IMAGE }}:${{ steps.version.outputs.version }}
            ${{ env.API_IMAGE }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push AI Worker
        uses: docker/build-push-action@v5
        with:
          context: ./ai-service
          push: true
          tags: |
            ${{ env.AI_WORKER_IMAGE }}:${{ steps.version.outputs.version }}
            ${{ env.AI_WORKER_IMAGE }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Set up Helm
        uses: azure/setup-helm@v3

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG_STAGING }}

      - name: Deploy to staging
        run: |
          helm upgrade --install promptops ./charts/promptops \
            --namespace promptops-staging \
            --create-namespace \
            -f ./charts/promptops/values-staging.yaml \
            --set image.api.tag=${{ needs.build.outputs.version }} \
            --set image.aiWorker.tag=${{ needs.build.outputs.version }}

  deploy-production:
    needs: [build, deploy-staging]
    runs-on: ubuntu-latest
    environment: production
    if: github.event_name == 'release'
    steps:
      - uses: actions/checkout@v4

      - name: Set up Helm
        uses: azure/setup-helm@v3

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG_PRODUCTION }}

      - name: Deploy to production
        run: |
          helm upgrade --install promptops ./charts/promptops \
            --namespace promptops \
            --create-namespace \
            -f ./charts/promptops/values-production.yaml \
            --set image.api.tag=${{ needs.build.outputs.version }} \
            --set image.aiWorker.tag=${{ needs.build.outputs.version }}
```

## Disaster Recovery

### Backup Strategy

```yaml
# Velero backup schedule
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: promptops-daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  template:
    includedNamespaces:
      - promptops
      - promptops-data
    includedResources:
      - "*"
    storageLocation: default
    volumeSnapshotLocations:
      - default
    ttl: 720h  # 30 days
```

### Database Backup

```bash
#!/bin/bash
# scripts/backup-db.sh

BACKUP_NAME="promptops-$(date +%Y%m%d-%H%M%S)"
BUCKET="s3://promptops-backups/database"

# Create backup
kubectl exec -n promptops-data postgresql-0 -- \
  pg_dump -U postgres -Fc promptops > /tmp/${BACKUP_NAME}.dump

# Upload to S3
aws s3 cp /tmp/${BACKUP_NAME}.dump ${BUCKET}/${BACKUP_NAME}.dump

# Cleanup
rm /tmp/${BACKUP_NAME}.dump

# Retain last 30 backups
aws s3 ls ${BUCKET}/ | sort | head -n -30 | awk '{print $4}' | \
  xargs -I {} aws s3 rm ${BUCKET}/{}
```

## Security Hardening

### Pod Security Policy

```yaml
# templates/podsecuritypolicy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: promptops-restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
```

## Resource Quotas (Multi-Tenant)

```yaml
# Per-tenant resource quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: promptops-tenant-{{ .Values.tenantId }}
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    persistentvolumeclaims: "10"
    services: "20"
    secrets: "50"
    configmaps: "50"
```
