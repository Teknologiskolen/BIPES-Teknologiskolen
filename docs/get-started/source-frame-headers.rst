Source Frame Headers for Vision and ML
======================================

BIPES source devices can send image frames over the console/serial stream. Each
frame starts with a small text header that tells BIPES what kind of image data is
coming next and, optionally, how that data should be used by Vision or ML
widgets.

This page documents the recommended header format so device firmware, examples,
and widgets stay compatible.

Frame Structure
---------------

Every frame has three parts:

.. code-block:: text

   BIPES_CAMERA_FRAME
   <FORMAT> <requestId> <width> <height> <byteLength> [key=value ...]
   <raw image bytes>
   END <requestId>

The first five fields on the second line are required. Metadata fields after
``byteLength`` are optional ``key=value`` pairs.

Supported image formats:

.. list-table::
   :header-rows: 1

   * - Format
     - Payload
     - Notes
   * - ``JPEG``
     - JPEG encoded bytes
     - BIPES stores this as ``image/jpeg``.
   * - ``GRAY8``
     - One byte per pixel
     - BIPES converts this to an image for display and processing.
   * - ``RAW565``
     - RGB565, two bytes per pixel
     - BIPES converts this to an image for display and processing.

Header Schema
-------------

Required fields:

.. code-block:: text

   <FORMAT> <requestId> <width> <height> <byteLength>

.. list-table::
   :header-rows: 1

   * - Field
     - Required
     - Example
     - Meaning
   * - ``FORMAT``
     - Yes
     - ``JPEG``
     - One of ``JPEG``, ``GRAY8``, or ``RAW565``.
   * - ``requestId``
     - Yes
     - ``cam1``
     - Identifier that must match the final ``END requestId`` line.
   * - ``width``
     - Yes
     - ``320``
     - Image width in pixels.
   * - ``height``
     - Yes
     - ``240``
     - Image height in pixels.
   * - ``byteLength``
     - Yes
     - ``18422``
     - Number of raw payload bytes immediately following the header line.

Optional metadata fields:

.. code-block:: text

   data=image task=vision vision=vision-input label=front

.. list-table::
   :header-rows: 1

   * - Key
     - Example
     - Used by
     - Meaning
   * - ``data``
     - ``image``, ``mask``, ``depth``
     - Device page, future widgets
     - Broad data type. Use ``image`` for normal camera frames.
   * - ``kind``
     - ``image``
     - Device page, future widgets
     - Alias for ``data`` if ``data`` is not present.
   * - ``contentType``
     - ``image/jpeg``
     - Device page
     - MIME-style content type.
   * - ``mime``
     - ``image/jpeg``
     - Device page
     - Alias for ``contentType``.
   * - ``task``
     - ``vision`` or ``ml``
     - Documentation/user setup
     - Declares the intended BIPES tool.
   * - ``vision``
     - ``vision-input``
     - Vision widget
     - Routes this frame to a Vision input node id.
   * - ``visionInput``
     - ``vision-input``
     - Vision widget
     - Alias for ``vision``.
   * - ``input``
     - ``vision-input``
     - Vision widget
     - Short alias for ``vision``.
   * - ``ml``
     - ``current`` or ``model-id``
     - Documentation/user setup
     - Documents the intended ML workspace. Current ML widgets still choose the workspace in the widget settings.
   * - ``label``
     - ``front-camera``
     - Device page
     - Human-friendly source/frame label.
   * - ``name``
     - ``front-camera``
     - Device page
     - Alias for ``label``.

Metadata values are separated by spaces. If a value needs a space, URL-encode it
first, for example ``label=front%20camera``.

Vision Headers
--------------

Vision can have multiple image input nodes. The Vision editor labels them
numerically from ``Image input 0``. The label is for humans; routing still uses
the input node id shown on the input node card. To make a source device route a
frame to a specific Vision input, include ``vision=<input-node-id>`` in the
header.

Single Vision input:

.. code-block:: text

   BIPES_CAMERA_FRAME
   JPEG cam1 320 240 18422 data=image task=vision vision=vision-input label=input-0
   <18422 jpeg bytes>
   END cam1

Two Vision inputs, for example a live image and a mask/reference image:

.. code-block:: text

   BIPES_CAMERA_FRAME
   JPEG live1 320 240 18422 data=image task=vision vision=vision-live label=input-0
   <18422 jpeg bytes>
   END live1

   BIPES_CAMERA_FRAME
   GRAY8 mask1 320 240 76800 data=mask task=vision vision=vision-mask label=input-1
   <76800 gray bytes>
   END mask1

If a Vision widget has multiple input nodes and no ``vision=...`` header is
present, BIPES cannot know which input the frame belongs to. In that case, either
add header routing on the source device or configure the widget's input source
routing JSON manually.

ML Headers
----------

ML widgets use the image source selected in the widget settings. Header metadata
is still useful because it documents what kind of image the device is sending and
shows up in BIPES source-device information.

Recommended ML image header:

.. code-block:: text

   BIPES_CAMERA_FRAME
   JPEG ml1 224 224 14320 data=image task=ml ml=current label=classifier-camera
   <14320 jpeg bytes>
   END ml1

Recommended ML grayscale header:

.. code-block:: text

   BIPES_CAMERA_FRAME
   GRAY8 mlgray1 96 96 9216 data=image task=ml ml=current label=gray-classifier
   <9216 gray bytes>
   END mlgray1

Current ML widgets do not automatically select an ML workspace from the ``ml``
metadata field. The widget's ``workspaceId`` setting still controls which model
is used. The ``ml`` field is included so firmware and source-device headers can
clearly describe intent and remain forward-compatible.

Minimal Valid Headers
---------------------

These remain valid for backwards compatibility:

.. code-block:: text

   JPEG cam1 320 240 18422
   GRAY8 frame2 160 120 19200
   RAW565 frame3 160 120 38400

Recommended New Headers
-----------------------

Prefer the richer form for new source devices:

.. code-block:: text

   JPEG cam1 320 240 18422 data=image task=vision vision=vision-input label=front
   JPEG ml1 224 224 14320 data=image task=ml ml=current label=classifier-camera

This makes the Device page easier to inspect and helps Vision widgets route
multi-input data correctly.

Continuous Streaming
--------------------

For continuous streaming, the source device can repeatedly send complete
``BIPES_CAMERA_FRAME`` blocks without waiting for a ``BIPES_CAPTURE`` request.
BIPES treats this as a lossy stream: it keeps the newest completed frame and may
drop stale frames if the browser is still converting or processing the previous
one. This is intentional; Vision and ML usually want the newest frame, not a
large backlog.

There are two source-device trigger modes:

* ``Streaming``: BIPES sends ``STREAM <fps>`` to the selected source device when
  the widget starts, for example ``STREAM 4``. When the widget stops, BIPES sends
  ``STOP_STREAM``. The source should stream complete frame blocks at the
  requested rate until it receives the stop command.
* ``Request``: the target device controls the camera source. When the target
  prints a request such as ``CAPTURE`` or ``STREAM <fps>``, BIPES forwards the
  request to the selected source device.

Recommended source-device loop:

.. code-block:: text

   repeat:
     capture image
     encode image
     write "BIPES_CAMERA_FRAME\n"
     write "<FORMAT> <requestId> <width> <height> <byteLength> data=image task=vision vision=<input-id> label=input-0\n"
     write exactly <byteLength> payload bytes
     write "\nEND <requestId>\n"
     wait until the serial write is fully flushed
     sleep or skip frames to match the available bandwidth

Do not write terminal logs inside the payload. Logs are fine between complete
frames, but they should be short because the serial connection is shared by the
terminal, camera stream, and dashboard commands.

Bandwidth matters. At ``115200`` baud, the practical maximum is roughly
``11 KB/s`` before overhead. A single ``18 KB`` JPEG cannot reliably stream at
multiple frames per second on that connection. For smoother streaming, reduce
resolution, reduce JPEG quality, use ``GRAY8`` for small masks, increase the
baud rate when possible, or stream fewer frames per second.

If the image becomes mostly white at higher frame rates, common causes are:

* The camera is being captured faster than exposure/auto-gain can settle.
* The serial link cannot finish one frame before the next frame starts.
* The device is sending corrupted/truncated JPEG bytes because buffers are being reused too early.
* The browser is receiving frames faster than it can decode and process them.

The safest firmware behavior is to drop frames on the device side when the link
is busy, rather than queueing many old frames.
