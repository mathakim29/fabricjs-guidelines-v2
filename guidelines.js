/**
 * Should objects be aligned by a bounding box?
 * [Bug] Scaled objects sometimes can not be aligned by edges
 *
 */

/** GLOBAL CONSTANTS */
CENTER_LINE_MARGIN = 4;
CENTER_LINE_COLOR = "rgba(127,0,255,0.5)";
CENTER_LINE_WIDTH = 3;

ALIGN_LINE_OFFSET 
ALIGN_LINE_MARGIN = 4;
ALIGN_LINE_WIDTH = 3;
ALIGN_LINE_COLOR = "rgb(0,255,0)";

function initAligningGuidelines(canvas) {
  var ctx = canvas.getSelectionContext(),
    aligningLineOffset = ALIGN_LINE_OFFSET,
    aligningLineMargin = ALIGN_LINE_MARGIN,
    aligningLineWidth = ALIGN_LINE_WIDTH,
    aligningLineColor = ALIGN_LINE_COLOR,
    viewportTransform,
    zoom = 1;

  function drawVerticalLine(coords) {
    drawLine(
      coords.x + 0.5,
      coords.y1 > coords.y2 ? coords.y2 : coords.y1,
      coords.x + 0.5,
      coords.y2 > coords.y1 ? coords.y2 : coords.y1,
    );
  }

  function drawHorizontalLine(coords) {
    drawLine(
      coords.x1 > coords.x2 ? coords.x2 : coords.x1,
      coords.y + 0.5,
      coords.x2 > coords.x1 ? coords.x2 : coords.x1,
      coords.y + 0.5,
    );
  }

  function drawLine(x1, y1, x2, y2) {
    ctx.save();
    ctx.lineWidth = aligningLineWidth;
    ctx.strokeStyle = aligningLineColor;

    // Set dotted line pattern (adjust values for desired spacing)
    ctx.setLineDash([3, 3]); // 3px dash, 3px gap

    ctx.beginPath();
    ctx.moveTo(
      x1 * zoom + viewportTransform[4],
      y1 * zoom + viewportTransform[5],
    );
    ctx.lineTo(
      x2 * zoom + viewportTransform[4],
      y2 * zoom + viewportTransform[5],
    );
    ctx.stroke();

    // Reset line dash to solid (optional, but good practice)
    ctx.setLineDash([]);
    ctx.restore();
  }

  function isInRange(value1, value2) {
    value1 = Math.round(value1);
    value2 = Math.round(value2);
    for (
      var i = value1 - aligningLineMargin, len = value1 + aligningLineMargin;
      i <= len;
      i++
    ) {
      if (i === value2) {
        return true;
      }
    }
    return false;
  }

  var verticalLines = [],
    horizontalLines = [];

  function snapping(e) {
    var activeObject = e.target,
      canvasObjects = canvas.getObjects(),
      activeObjectCenter = activeObject.getCenterPoint(),
      activeObjectLeft = activeObjectCenter.x,
      activeObjectTop = activeObjectCenter.y,
      activeObjectBoundingRect = activeObject.getBoundingRect(),
      activeObjectHeight =
        activeObjectBoundingRect.height / viewportTransform[3],
      activeObjectWidth = activeObjectBoundingRect.width / viewportTransform[0],
      horizontalInTheRange = false,
      verticalInTheRange = false,
      transform = canvas._currentTransform;

    if (!transform) return;

    // It should be trivial to DRY this up by encapsulating (repeating) creation of x1, x2, y1, and y2 into functions,
    // but we're not doing it here for perf. reasons -- as this a function that's invoked on every mouse move

    for (var i = canvasObjects.length; i--; ) {
      if (canvasObjects[i] === activeObject) continue;

      var objectCenter = canvasObjects[i].getCenterPoint(),
        objectLeft = objectCenter.x,
        objectTop = objectCenter.y,
        objectBoundingRect = canvasObjects[i].getBoundingRect(),
        objectHeight = objectBoundingRect.height / viewportTransform[3],
        objectWidth = objectBoundingRect.width / viewportTransform[0];

      // Horizontal center alignment
      if (isInRange(objectLeft, activeObjectLeft)) {
        verticalInTheRange = true;
        verticalLines.push({
          x: objectLeft,
          y1: Math.min(objectTop, activeObjectTop) - 20, // Extend line slightly
          y2: Math.max(objectTop, activeObjectTop) + 20,
        });
      }

      // Vertical center alignment
      if (isInRange(objectTop, activeObjectTop)) {
        horizontalInTheRange = true;
        horizontalLines.push({
          y: objectTop,
          x1: Math.min(objectLeft, activeObjectLeft) - 20,
          x2: Math.max(objectLeft, activeObjectLeft) + 20,
        });
      }

      // snaps if the right side of the active object touches the left side of the object
      if (
        isInRange(
          activeObjectLeft + activeObjectWidth / 2,
          objectLeft - objectWidth / 2,
        )
      ) {
        verticalInTheRange = true;
        verticalLines.push({
          x: objectLeft - objectWidth / 2,
          y1:
            objectTop < activeObjectTop
              ? objectTop - objectHeight / 2 - aligningLineOffset
              : objectTop + objectHeight / 2 + aligningLineOffset,
          y2:
            activeObjectTop > objectTop
              ? activeObjectTop + activeObjectHeight / 2 + aligningLineOffset
              : activeObjectTop - activeObjectHeight / 2 - aligningLineOffset,
        });

        activeObject.setPositionByOrigin(
          new fabric.Point(
            objectLeft - objectWidth / 2 - activeObjectWidth / 2,
            activeObjectTop,
          ),
          "center",
          "center",
        );
      }

      // snaps if the left side of the active object touches the right side of the object
      if (
        isInRange(
          activeObjectLeft - activeObjectWidth / 2,
          objectLeft + objectWidth / 2,
        )
      ) {
        verticalInTheRange = true;
        verticalLines.push({
          x: objectLeft + objectWidth / 2,
          y1:
            objectTop < activeObjectTop
              ? objectTop - objectHeight / 2 - aligningLineOffset
              : objectTop + objectHeight / 2 + aligningLineOffset,
          y2:
            activeObjectTop > objectTop
              ? activeObjectTop + activeObjectHeight / 2 + aligningLineOffset
              : activeObjectTop - activeObjectHeight / 2 - aligningLineOffset,
        });

        activeObject.setPositionByOrigin(
          new fabric.Point(
            objectLeft + objectWidth / 2 + activeObjectWidth / 2,
            activeObjectTop,
          ),
          "center",
          "center",
        );
      }

      // snaps if the bottom of the object touches the top of the active object
      if (
        isInRange(
          objectTop + objectHeight / 2,
          activeObjectTop - activeObjectHeight / 2,
        )
      ) {
        horizontalInTheRange = true;
        horizontalLines.push({
          y: objectTop + objectHeight / 2,
          x1:
            objectLeft < activeObjectLeft
              ? objectLeft - objectWidth / 2 - aligningLineOffset
              : objectLeft + objectWidth / 2 + aligningLineOffset,
          x2:
            activeObjectLeft > objectLeft
              ? activeObjectLeft + activeObjectWidth / 2 + aligningLineOffset
              : activeObjectLeft - activeObjectWidth / 2 - aligningLineOffset,
        });

        activeObject.setPositionByOrigin(
          new fabric.Point(
            activeObjectLeft,
            objectTop + objectHeight / 2 + activeObjectHeight / 2,
          ),
          "center",
          "center",
        );
      }

      // snaps if the top of the object touches the bottom of the active object
      if (
        isInRange(
          objectTop - objectHeight / 2,
          activeObjectTop + activeObjectHeight / 2,
        )
      ) {
        horizontalInTheRange = true;
        horizontalLines.push({
          y: objectTop - objectHeight / 2,
          x1:
            objectLeft < activeObjectLeft
              ? objectLeft - objectWidth / 2 - aligningLineOffset
              : objectLeft + objectWidth / 2 + aligningLineOffset,
          x2:
            activeObjectLeft > objectLeft
              ? activeObjectLeft + activeObjectWidth / 2 + aligningLineOffset
              : activeObjectLeft - activeObjectWidth / 2 - aligningLineOffset,
        });

        activeObject.setPositionByOrigin(
          new fabric.Point(
            activeObjectLeft,
            objectTop - objectHeight / 2 - activeObjectHeight / 2,
          ),
          "center",
          "center",
        );
      }

      // snap by the horizontal center line
      if (isInRange(objectLeft, activeObjectLeft)) {
        verticalInTheRange = true;
        verticalLines.push({
          x: objectLeft,
          y1:
            objectTop < activeObjectTop
              ? objectTop - objectHeight / 2 - aligningLineOffset
              : objectTop + objectHeight / 2 + aligningLineOffset,
          y2:
            activeObjectTop > objectTop
              ? activeObjectTop + activeObjectHeight / 2 + aligningLineOffset
              : activeObjectTop - activeObjectHeight / 2 - aligningLineOffset,
        });
        activeObject.setPositionByOrigin(
          new fabric.Point(objectLeft, activeObjectTop),
          "center",
          "center",
        );
      }

      // snap by the left edge
      if (
        isInRange(
          objectLeft - objectWidth / 2,
          activeObjectLeft - activeObjectWidth / 2,
        )
      ) {
        verticalInTheRange = true;
        verticalLines.push({
          x: objectLeft - objectWidth / 2,
          y1:
            objectTop < activeObjectTop
              ? objectTop - objectHeight / 2 - aligningLineOffset
              : objectTop + objectHeight / 2 + aligningLineOffset,
          y2:
            activeObjectTop > objectTop
              ? activeObjectTop + activeObjectHeight / 2 + aligningLineOffset
              : activeObjectTop - activeObjectHeight / 2 - aligningLineOffset,
        });
        activeObject.setPositionByOrigin(
          new fabric.Point(
            objectLeft - objectWidth / 2 + activeObjectWidth / 2,
            activeObjectTop,
          ),
          "center",
          "center",
        );
      }

      // snap by the right edge
      if (
        isInRange(
          objectLeft + objectWidth / 2,
          activeObjectLeft + activeObjectWidth / 2,
        )
      ) {
        verticalInTheRange = true;
        verticalLines.push({
          x: objectLeft + objectWidth / 2,
          y1:
            objectTop < activeObjectTop
              ? objectTop - objectHeight / 2 - aligningLineOffset
              : objectTop + objectHeight / 2 + aligningLineOffset,
          y2:
            activeObjectTop > objectTop
              ? activeObjectTop + activeObjectHeight / 2 + aligningLineOffset
              : activeObjectTop - activeObjectHeight / 2 - aligningLineOffset,
        });
        activeObject.setPositionByOrigin(
          new fabric.Point(
            objectLeft + objectWidth / 2 - activeObjectWidth / 2,
            activeObjectTop,
          ),
          "center",
          "center",
        );
      }

      // snap by the vertical center line
      if (isInRange(objectTop, activeObjectTop)) {
        horizontalInTheRange = true;
        horizontalLines.push({
          y: objectTop,
          x1:
            objectLeft < activeObjectLeft
              ? objectLeft - objectWidth / 2 - aligningLineOffset
              : objectLeft + objectWidth / 2 + aligningLineOffset,
          x2:
            activeObjectLeft > objectLeft
              ? activeObjectLeft + activeObjectWidth / 2 + aligningLineOffset
              : activeObjectLeft - activeObjectWidth / 2 - aligningLineOffset,
        });
        activeObject.setPositionByOrigin(
          new fabric.Point(activeObjectLeft, objectTop),
          "center",
          "center",
        );
      }

      // snap by the top edge
      if (
        isInRange(
          objectTop - objectHeight / 2,
          activeObjectTop - activeObjectHeight / 2,
        )
      ) {
        horizontalInTheRange = true;
        horizontalLines.push({
          y: objectTop - objectHeight / 2,
          x1:
            objectLeft < activeObjectLeft
              ? objectLeft - objectWidth / 2 - aligningLineOffset
              : objectLeft + objectWidth / 2 + aligningLineOffset,
          x2:
            activeObjectLeft > objectLeft
              ? activeObjectLeft + activeObjectWidth / 2 + aligningLineOffset
              : activeObjectLeft - activeObjectWidth / 2 - aligningLineOffset,
        });
        activeObject.setPositionByOrigin(
          new fabric.Point(
            activeObjectLeft,
            objectTop - objectHeight / 2 + activeObjectHeight / 2,
          ),
          "center",
          "center",
        );
      }

      // snap by the bottom edge
      if (
        isInRange(
          objectTop + objectHeight / 2,
          activeObjectTop + activeObjectHeight / 2,
        )
      ) {
        horizontalInTheRange = true;
        horizontalLines.push({
          y: objectTop + objectHeight / 2,
          x1:
            objectLeft < activeObjectLeft
              ? objectLeft - objectWidth / 2 - aligningLineOffset
              : objectLeft + objectWidth / 2 + aligningLineOffset,
          x2:
            activeObjectLeft > objectLeft
              ? activeObjectLeft + activeObjectWidth / 2 + aligningLineOffset
              : activeObjectLeft - activeObjectWidth / 2 - aligningLineOffset,
        });
        activeObject.setPositionByOrigin(
          new fabric.Point(
            activeObjectLeft,
            objectTop + objectHeight / 2 - activeObjectHeight / 2,
          ),
          "center",
          "center",
        );
      }
    }

    if (!horizontalInTheRange) {
      horizontalLines.length = 0;
    }

    if (!verticalInTheRange) {
      verticalLines.length = 0;
    }
  }

  canvas.on("mouse:down", function () {
    viewportTransform = canvas.viewportTransform;
    zoom = canvas.getZoom();
  });

  canvas.on("object:moving", function (e) {
    snapping(e);
  });

  canvas.on("object:scaling", function (e) {
    snapping(e);
  });

  canvas.on("object:rotating", function (e) {
    snapping(e);
  });

  canvas.on("before:render", function () {
    if (canvas.contextTop) {
      canvas.clearContext(canvas.contextTop);
    }
  });

  canvas.on("after:render", function () {
    for (var i = verticalLines.length; i--; ) {
      drawVerticalLine(verticalLines[i]);
    }
    for (var i = horizontalLines.length; i--; ) {
      drawHorizontalLine(horizontalLines[i]);
    }

    verticalLines.length = horizontalLines.length = 0;
  });

  canvas.on("mouse:up", function () {
    verticalLines.length = horizontalLines.length = 0;
    canvas.renderAll();
  });
}

/**
 * Augments canvas by assigning to `onObjectMove` and `onAfterRender`.
 * This kind of sucks because other code using those methods will stop functioning.
 * Need to fix it by replacing callbacks with pub/sub kind of subscription model.
 * (or maybe use existing fabric.util.fire/observe (if it won't be too slow))
 */
function initCenteringGuidelines(canvas) {
  var canvasWidth = canvas.getWidth(),
    canvasHeight = canvas.getHeight(),
    canvasWidthCenter = canvasWidth / 2,
    canvasHeightCenter = canvasHeight / 2,
    canvasWidthCenterMap = {},
    canvasHeightCenterMap = {},
    centerLineMargin = CENTER_LINE_MARGIN,
    centerLineColor = CENTER_LINE_COLOR,
    centerLineWidth = CENTER_LINE_WIDTH,
    ctx = canvas.getSelectionContext(),
    viewportTransform;

  for (
    var i = canvasWidthCenter - centerLineMargin,
      len = canvasWidthCenter + centerLineMargin;
    i <= len;
    i++
  ) {
    canvasWidthCenterMap[Math.round(i)] = true;
  }
  for (
    var i = canvasHeightCenter - centerLineMargin,
      len = canvasHeightCenter + centerLineMargin;
    i <= len;
    i++
  ) {
    canvasHeightCenterMap[Math.round(i)] = true;
  }

  function showVerticalCenterLine() {
    showCenterLine(
      canvasWidthCenter + 0.5,
      0,
      canvasWidthCenter + 0.5,
      canvasHeight,
    );
  }

  function showHorizontalCenterLine() {
    showCenterLine(
      0,
      canvasHeightCenter + 0.5,
      canvasWidth,
      canvasHeightCenter + 0.5,
    );
  }

  function showCenterLine(x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = centerLineColor;
    ctx.lineWidth = centerLineWidth;
    ctx.beginPath();
    ctx.moveTo(x1 * viewportTransform[0], y1 * viewportTransform[3]);
    ctx.lineTo(x2 * viewportTransform[0], y2 * viewportTransform[3]);
    ctx.stroke();
    ctx.restore();
  }

  var afterRenderActions = [],
    isInVerticalCenter,
    isInHorizontalCenter;

  canvas.on("mouse:down", function () {
    viewportTransform = canvas.viewportTransform;
  });

  canvas.on("object:moving", function (e) {
    var object = e.target,
      objectCenter = object.getCenterPoint(),
      transform = canvas._currentTransform;

    if (!transform) return;

    (isInVerticalCenter = Math.round(objectCenter.x) in canvasWidthCenterMap),
      (isInHorizontalCenter =
        Math.round(objectCenter.y) in canvasHeightCenterMap);

    if (isInHorizontalCenter || isInVerticalCenter) {
      object.setPositionByOrigin(
        new fabric.Point(
          isInVerticalCenter ? canvasWidthCenter : objectCenter.x,
          isInHorizontalCenter ? canvasHeightCenter : objectCenter.y,
        ),
        "center",
        "center",
      );
    }
  });

  canvas.on("before:render", function () {
    if (canvas.contextTop) {
      canvas.clearContext(canvas.contextTop);
    }
  });

  canvas.on("after:render", function () {
    if (isInVerticalCenter) {
      showVerticalCenterLine();
    }
    if (isInHorizontalCenter) {
      showHorizontalCenterLine();
    }
  });

  canvas.on("mouse:up", function () {
    // clear these values, to stop drawing guidelines once mouse is up
    isInVerticalCenter = isInHorizontalCenter = null;
    canvas.renderAll();
  });
}
