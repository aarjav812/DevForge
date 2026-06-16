import { k8sCoreV1Api } from "./config.js";

const TEMPLATE_IMAGE = process.env.TEMPLATE_IMAGE || "template";
const AGENT_IMAGE = process.env.AGENT_IMAGE || "agent";
const SYNC_AGENT_IMAGE = process.env.SYNC_AGENT_IMAGE || "sync-agent";

export async function createPod(sandboxId, projectId) {

    const podManifest = {
        metadata: {
            name: `sandbox-pod-${sandboxId}`,
            labels: {
                sandboxId: sandboxId
            }
        },
        spec: {
            volumes: [
                {
                    name: 'workspace-volume',
                    emptyDir: {}
                }
            ],
            initContainers: [
                {
                    name: 'init-container',
                    image: TEMPLATE_IMAGE,
                    imagePullPolicy: "IfNotPresent",
                    command: [ 'sh', '-c', 'cp -r /workspace/. /seed/' ],
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/seed'
                        }
                    ]
                }
            ],
            containers: [
                {
                    image: TEMPLATE_IMAGE,
                    imagePullPolicy: "IfNotPresent",
                    name: 'sandbox-container',
                    ports: [ { containerPort: 5173, name: "http" } ],
                    resources: {
                        limits: { cpu: "500m", memory: "1Gi" },
                        requests: { cpu: "250m", memory: "500Mi" }
                    },
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ]
                },
                {
                    image: AGENT_IMAGE,
                    imagePullPolicy: "IfNotPresent",
                    name: 'agent-container',
                    ports: [ { containerPort: 3000, name: "http" } ],
                    resources: {
                        limits: { cpu: "500m", memory: "1Gi" },
                        requests: { cpu: "250m", memory: "500Mi" }
                    },
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ]
                },
                {
                    image: SYNC_AGENT_IMAGE,
                    imagePullPolicy: "IfNotPresent",
                    name: 'sync-agent-container',
                    ports: [ { containerPort: 4000, name: "http" } ],
                    resources: {
                        limits: { cpu: "500m", memory: "1Gi" },
                        requests: { cpu: "250m", memory: "500Mi" }
                    },
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ],
                    env: [
                        {
                            name: "PROJECT_ID",
                            value: projectId
                        },
                        {
                            name: "AWS_ACCESS_KEY_ID",
                            valueFrom: {
                                secretKeyRef: {
                                    name: "aws",
                                    key: "AWS_ACCESS_KEY_ID"
                                }
                            }
                        },
                        {
                            name: "AWS_SECRET_ACCESS_KEY",
                            valueFrom: {
                                secretKeyRef: {
                                    name: "aws",
                                    key: "AWS_SECRET_ACCESS_KEY"
                                }
                            }

                        },
                        {
                            name: "AWS_REGION",
                            valueFrom: {
                                secretKeyRef: {
                                    name: "aws",
                                    key: "AWS_REGION"
                                }
                            }
                        }
                    ]
                }
            ]
        }
    }

    const response = await k8sCoreV1Api.createNamespacedPod({
        namespace: 'default',
        body: podManifest
    })

    return response;
}

export async function deletePod(sandboxId) {
    const response = await k8sCoreV1Api.deleteNamespacedPod({
        namespace: 'default',
        name: `sandbox-pod-${sandboxId}`
    }, {
        gracePeriodSeconds: 0,
    })

    return response;
}