# ML Pipeline Design

## Goal

Create one simple ML and Vision workflow with four stages:

1. Source
2. Train
3. Test
4. Deploy

The same workflow should support two runtime modes:

- Client-assisted processing
- Device-integrated processing

This lets users:

- build an image pipeline with nodes
- test it live
- train a classifier from images, poses, or audio
- deploy either as generated Python/code blocks for capable devices
- or run processing on the computer client and send results back via MQTT

## Multi-Pipeline Rule

Projects must support multiple independent pipelines.

Each pipeline can have:

- its own source setup
- its own Vision node graph
- its own classes and training settings
- its own deploy target
- one or more attached devices

This is necessary because different devices may need:

- different preprocessing nodes
- different labels
- different transports
- different MQTT output topics

So the unit of configuration should be a pipeline workspace, not one global ML model or one global Vision graph.

## Core Product Idea

The authoring experience should stay the same regardless of where inference runs.

Users should not need to learn separate tools for:

- browser testing
- client inference
- device inference
- dashboard integration

Instead, they build once and choose a deployment target at the end.

A single project should be able to contain many pipelines, for example:

- `Front Door Detector`
- `Pose Lab`
- `Machine Audio Fault Detector`

## Four Stages

### 1. Source

The Source stage defines where data comes from.

Supported source types:

- Browser webcam
- Device camera stream
- Device snapshot endpoint
- Uploaded image files
- Uploaded audio clips
- MQTT topic
- Saved datasets

Each source should expose:

- source type
- live preview
- sample capture action
- metadata such as device id, topic, frame size, class label

Each pipeline owns its own source definition.

Pipelines may also have multiple device bindings so one trained pipeline can be reused across similar devices with small overrides.

For device-driven use, the first practical sources should be:

- HTTP snapshot URL
- MJPEG stream
- WebSocket image stream

WebRTC can be added later, but it should not be the first transport requirement for microcontrollers.

## 2. Train

The Train stage is where labeled data is collected and a model is trained.

Training should happen on the client computer, not on the device.

This should support:

- Image classification
- Pose classification
- Audio classification

Training flow:

1. User chooses a class
2. User captures samples from the selected source
3. User reviews samples
4. User trains model in browser
5. User sees training status and metrics

Important rule:

- Devices provide data
- The client performs training

That keeps the system simple and makes live training realistic even for weak devices.

Training data belongs to a specific pipeline.

Different pipelines must not implicitly share classes or samples, because different device tasks may use completely different labels.

## 3. Test

The Test stage validates the pipeline before deployment.

Test modes:

- Single sample prediction
- Live stream prediction
- Compare classes and confidence
- Visual pipeline preview

The user should be able to:

- preview the source frame
- preview intermediate Vision node outputs
- preview final classifier output
- inspect label and confidence
- inspect latency

For node-based Vision, this stage should also show:

- original input
- selected node output
- final processed output

## 4. Deploy

The Deploy stage decides how the finished pipeline will run.

Two deployment targets:

### Client Pipeline

The client receives data from the device, performs processing locally, and sends results out.

Flow:

1. Device captures image or audio
2. Client receives sample or frame
3. Vision/ML runs on client
4. Result is published via MQTT or sent back to the device

Outputs:

- MQTT publish
- Dashboard display
- Return label/confidence to device
- Save event log

This should be the default path for:

- Pico W
- ESP32-CAM
- simple camera devices
- classroom testing

### Device Code

The client exports generated code for capable devices.

Outputs:

- Generated Python code
- Generated callable block
- Generated helper module

This path is only available when:

- the selected Vision nodes are exportable
- the model/runtime is supported on the selected device

This should target stronger devices only.

## Vision Pipeline

Vision should act as a node-based preprocessing system.

Users build a graph such as:

- Input
- Resize
- Crop
- Grayscale
- Threshold
- Blur
- Edge Detect
- Contours

The graph must support two modes:

- Test in browser
- Export supported nodes as device code

Not every node needs device export initially.

Each pipeline owns its own Vision graph.

That means one device can use:

- `crop -> grayscale -> threshold`

while another device in the same project can use:

- `resize -> blur -> contours`

### Exportable Vision Nodes for v1

Start with a limited exportable set:

- Resize
- Crop
- Grayscale
- Threshold
- Blur
- Invert

More advanced nodes can remain client-only until there is a stable device runtime.

## Classification Pipeline

Classification should sit after Source and optional Vision preprocessing.

Supported classifiers:

- Image classifier
- Pose classifier
- Audio classifier

The user experience should look the same across all three:

1. Select source
2. Collect labeled samples
3. Train
4. Test
5. Deploy

## Device Integration Modes

There are two major device scenarios.

### A. Advanced Device Integration

The device can run the exported pipeline itself.

Examples:

- Raspberry Pi
- stronger Linux devices
- selected high-capability embedded targets

In this mode, deploy produces:

- Python code
- a helper function
- optionally a callable Blockly block

Example output:

```python
label, confidence = classify_frame(frame)
if confidence > 0.8:
    mqtt_publish("vision/result", label)
```

### B. Simple Device + Client Processing

The device only captures and transmits data.

The computer client performs:

- preprocessing
- inference
- output publishing

This is the preferred first implementation for:

- Pico W
- ESP32-CAM
- BLE or Wi-Fi image sources

Example flow:

1. Device posts image frame
2. Client runs pipeline
3. Client publishes:

```json
{
  "label": "cat",
  "confidence": 0.93,
  "device_id": "cam_1"
}
```

4. Device or dashboard reacts to MQTT result

## MQTT Integration

MQTT should be the standard output path for client-assisted inference.

This keeps the processing pipeline loosely coupled from:

- dashboard widgets
- automation logic
- device-side reactions

Suggested output topics:

- `vision/result/<device_id>`
- `ml/result/<device_id>`
- `pose/result/<device_id>`
- `audio/result/<device_id>`

Suggested payload:

```json
{
  "label": "person",
  "confidence": 0.87,
  "class_id": "person",
  "timestamp": 1710000000
}
```

## Blocks and Codegen

Deploy should be able to produce either:

- raw Python code
- a generated helper library
- a callable block wrapping the generated helper

That means the deploy screen should expose:

- `Show Python`
- `Create Callable Block`
- `Use Client Runtime`

### Callable Block Idea

If a Vision or ML pipeline is exportable, create a generated block like:

- `Classify Camera Frame`
- `Run Vision Pipeline On Image`
- `Predict Pose Label`

The block should map to generated helper code instead of copying the entire model logic into the block generator.

## Recommended MVP

Build this in phases.

### Phase 1

- Source
  - Browser webcam
  - Uploaded images/audio
  - Device snapshot URL
- Train
  - Client-side image/audio/pose training
- Test
  - Live preview in browser
- Deploy
  - Client-assisted inference only
  - MQTT result publishing

This gives immediate value and works with existing browser ML direction.

### Phase 2

- Device WebSocket image input
- Vision pipeline feeding classifier input
- Result routing back to dashboard and devices
- Saved pipeline definitions

### Phase 3

- Exportable Vision pipelines
- Generated Python helper code
- Generated callable blocks
- Limited on-device inference support for capable targets

### Phase 4

- WebRTC sources for advanced streaming scenarios
- More exportable nodes
- Model packaging for stronger devices

## UX Recommendations

The UI should have one main editor with four tabs:

- Source
- Train
- Test
- Deploy

And it should also have a pipeline selector so the user first chooses which pipeline workspace to edit.

Inside a selected pipeline, there should optionally be a device attachment view for binding one or more devices to that pipeline.

### Source Tab

Show:

- source selector
- live preview
- connection settings
- capture controls

### Train Tab

Show:

- classes
- sample counts
- capture/upload actions
- train button

### Test Tab

Show:

- live preview
- processed output preview
- label/confidence
- performance info

### Deploy Tab

Show:

- target mode selector
- device compatibility
- MQTT output setup
- generated Python/code block output

### Devices View

If a pipeline is meant to serve multiple similar devices, the editor should expose a device view or device panel.

This should let the user:

- attach devices to the pipeline
- override source settings per device
- override output topic per device
- test each device binding independently

## Design Rules

- Build once, deploy two ways
- Train on client, not on device
- Use client-assisted inference as the default mode
- Only offer device export when the selected device supports it
- Keep Vision nodes exportable only when deterministic and supported
- Send small outputs over MQTT, not raw images
- Make transport details secondary to the user workflow
- Store multiple independent pipelines per project
- Allow one or more devices to be attached to each pipeline
- Allow per-device source and output overrides
- Use separate pipelines whenever preprocessing or class labels differ

## What WebRTC Is Good For

WebRTC is useful for:

- browser-to-browser media
- low-latency video streams
- advanced local streaming cases

WebRTC is not the simplest first step for microcontrollers.

For v1, prefer:

- HTTP snapshots
- MJPEG
- WebSocket image transfer

Then add WebRTC later if the device class can support it well.

## Proposed Internal Architecture

### Shared Pipeline Definition

Both Vision and ML should save into a common pipeline object.

At the project level, this object should contain:

- a selected pipeline id
- a tree of pipelines

Each pipeline should contain:

- source config
- preprocessing graph
- model config
- output config
- deployment target
- device bindings

### Runtime Modes

The same pipeline object should be runnable by:

- client runtime
- code generator

### Generator Output

The code generator should emit:

- helper Python
- optional generated block metadata
- compatibility report

## Proposed Saved Format

The saved format should support:

- many pipelines in one project
- one or more devices attached to a pipeline
- per-device overrides when needed

Example:

```json
{
  "pipeline": {
    "version": 1,
    "selectedId": "pipe-front-door",
    "tree": {
      "pipe-front-door": {
        "id": "pipe-front-door",
        "name": "Front Door Detector",
        "mode": "image",
        "source": {
          "kind": "device_snapshot",
          "transport": "http",
          "url": "http://192.168.0.20/capture",
          "pollMs": 500
        },
        "vision": {
          "enabled": true,
          "nodes": []
        },
        "ml": {
          "kind": "classifier",
          "classes": [
            {"id": "person", "name": "Person"},
            {"id": "empty", "name": "Empty"}
          ],
          "settings": {
            "epochs": 20,
            "batchSize": 16,
            "learningRate": 0.003
          }
        },
        "test": {
          "live": true
        },
        "deploy": {
          "target": "client_runtime",
          "output": {
            "kind": "mqtt",
            "topic": "ml/result/front-door",
            "payload": "json"
          }
        },
        "deviceBindings": [
          {
            "deviceId": "cam-front-1",
            "name": "Front Camera 1",
            "sourceOverride": {
              "url": "http://192.168.0.20/capture"
            },
            "outputOverride": {
              "topic": "ml/result/cam-front-1"
            }
          },
          {
            "deviceId": "cam-front-2",
            "name": "Front Camera 2",
            "sourceOverride": {
              "url": "http://192.168.0.21/capture"
            },
            "outputOverride": {
              "topic": "ml/result/cam-front-2"
            }
          }
        ]
      },
      "pipe-pose-lab": {
        "id": "pipe-pose-lab",
        "name": "Pose Lab",
        "mode": "pose",
        "source": {
          "kind": "browser_webcam"
        },
        "vision": {
          "enabled": false,
          "nodes": []
        },
        "ml": {
          "kind": "classifier",
          "classes": [
            {"id": "arms-up", "name": "Arms Up"},
            {"id": "arms-down", "name": "Arms Down"}
          ],
          "settings": {
            "epochs": 20,
            "batchSize": 16,
            "learningRate": 0.003
          }
        },
        "test": {
          "live": true
        },
        "deploy": {
          "target": "client_runtime",
          "output": {
            "kind": "mqtt",
            "topic": "pose/result/lab",
            "payload": "json"
          }
        },
        "deviceBindings": []
      }
    }
  }
}
```

Rule of thumb:

- different Vision nodes or different classes means separate pipelines
- same Vision nodes and same classes but different sources or MQTT topics can use one pipeline with multiple device bindings

## Immediate Next Step

The first implementation target should be:

- Source
  - browser webcam
  - uploaded files
  - device snapshot URL
- Train
  - browser-side classifier training
- Test
  - live preview and prediction
- Deploy
  - client runtime + MQTT output

After that, add:

- exportable Vision nodes
- generated Python helper code
- generated callable blocks
