const LINE_COLOR = "red";
const LINE_WIDTH = 1;
const LINE_DASH = [3, 3];
const LINE_MARGIN = 4;
const CROSS_SIZE = 6;

export function initSnappingGuidelines(canvas) {
  const ctx = canvas.getSelectionContext();
  let viewportTransform = canvas.viewportTransform;
  let zoom = canvas.getZoom();

  const measurementLines = [];
  const font = "12px Arial";

  const vLines = [],
    hLines = [],
    crossMarks = [];

  function drawLine(x1, y1, x2, y2, dashed = true) {
    ctx.save();
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = LINE_COLOR;
    if (dashed) ctx.setLineDash(LINE_DASH);
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
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawVerticalLine({ x, y1, y2 }) {
    drawLine(x, y1, x, y2);
  }

  function drawHorizontalLine({ y, x1, x2 }) {
    drawLine(x1, y, x2, y);
  }

  function drawCross(x, y) {
    const cx = x * zoom + viewportTransform[4];
    const cy = y * zoom + viewportTransform[5];
    ctx.save();
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - CROSS_SIZE / 2, cy - CROSS_SIZE / 2);
    ctx.lineTo(cx + CROSS_SIZE / 2, cy + CROSS_SIZE / 2);
    ctx.moveTo(cx + CROSS_SIZE / 2, cy - CROSS_SIZE / 2);
    ctx.lineTo(cx - CROSS_SIZE / 2, cy + CROSS_SIZE / 2);
    ctx.stroke();
    ctx.restore();
  }

  function isInRange(v1, v2) {
    return Math.abs(Math.round(v1) - Math.round(v2)) <= LINE_MARGIN;
  }

  function getObjectMetrics(obj) {
    const center = obj.getCenterPoint();
    const bounds = obj.getBoundingRect(true); // include viewportTransform
    const w = bounds.width / viewportTransform[0];
    const h = bounds.height / viewportTransform[3];

    return {
      left: center.x,
      top: center.y,
      corners: [
        { x: center.x - w / 2, y: center.y - h / 2 },
        { x: center.x + w / 2, y: center.y - h / 2 },
        { x: center.x - w / 2, y: center.y + h / 2 },
        { x: center.x + w / 2, y: center.y + h / 2 },
      ],
      width: w,
      height: h,
    };
  }

  function snapping(e) {
    const a = e.target;
    const objects = canvas.getObjects();
    const aMetrics = getObjectMetrics(a);

    let snapX = a.left;
    let snapY = a.top;
    let snappedX = false;
    let snappedY = false;

    for (let b of objects) {
      if (b === a) continue;
      const bMetrics = getObjectMetrics(b);

      // center alignment
      if (!snappedX && isInRange(aMetrics.left, bMetrics.left)) {
        snapX = bMetrics.left;
        vLines.push({ x: snapX, y1: a.top, y2: b.top });
        crossMarks.push({ x: snapX, y: a.top });
        snappedX = true;
      }

      if (!snappedY && isInRange(aMetrics.top, bMetrics.top)) {
        snapY = bMetrics.top;
        hLines.push({ y: snapY, x1: a.left, x2: b.left });
        crossMarks.push({ x: a.left, y: snapY });
        snappedY = true;
      }

      // edge snapping (horizontal & vertical)
      const xPairs = [
        aMetrics.left - aMetrics.width / 2,
        aMetrics.left + aMetrics.width / 2,
      ];
      const bxPairs = [
        bMetrics.left - bMetrics.width / 2,
        bMetrics.left + bMetrics.width / 2,
      ];
      for (let ax of xPairs) {
        for (let bx of bxPairs) {
          if (!snappedX && isInRange(ax, bx)) {
            const dx = bx - ax;
            snapX = a.left + dx;
            vLines.push({ x: bx, y1: a.top, y2: b.top });
            crossMarks.push({ x: bx, y: a.top });
            snappedX = true;
          }
        }
      }

      const yPairs = [
        aMetrics.top - aMetrics.height / 2,
        aMetrics.top + aMetrics.height / 2,
      ];
      const byPairs = [
        bMetrics.top - bMetrics.height / 2,
        bMetrics.top + bMetrics.height / 2,
      ];
      for (let ay of yPairs) {
        for (let by of byPairs) {
          if (!snappedY && isInRange(ay, by)) {
            const dy = by - ay;
            snapY = a.top + dy;
            hLines.push({ y: by, x1: a.left, x2: b.left });
            crossMarks.push({ x: a.left, y: by });
            snappedY = true;
          }
        }
      }

      // corner to corner
      for (const ac of aMetrics.corners) {
        for (const bc of bMetrics.corners) {
          if (!snappedX && isInRange(ac.x, bc.x)) {
            const dx = bc.x - ac.x;
            snapX = a.left + dx;
            snappedX = true;
          }
          if (!snappedY && isInRange(ac.y, bc.y)) {
            const dy = bc.y - ac.y;
            snapY = a.top + dy;
            snappedY = true;
          }
          if (isInRange(ac.x, bc.x) && isInRange(ac.y, bc.y)) {
            crossMarks.push({ x: bc.x, y: bc.y });
          }
        }
      }

      // corner to center
      for (const ac of aMetrics.corners) {
        if (!snappedX && isInRange(ac.x, bMetrics.left)) {
          snapX = a.left + (bMetrics.left - ac.x);
          snappedX = true;
        }
        if (!snappedY && isInRange(ac.y, bMetrics.top)) {
          snapY = a.top + (bMetrics.top - ac.y);
          snappedY = true;
        }
        if (isInRange(ac.x, bMetrics.left) && isInRange(ac.y, bMetrics.top)) {
          crossMarks.push({ x: bMetrics.left, y: bMetrics.top });
        }
      }
    }

    a.set({ left: snapX, top: snapY });

    if (!snappedX) vLines.length = 0;
    if (!snappedY) hLines.length = 0;
  }

  canvas.on("mouse:down", () => {
    viewportTransform = canvas.viewportTransform;
    zoom = canvas.getZoom();
  });

  canvas.on("object:moving", snapping);
  canvas.on("object:rotating", snapping);
  canvas.on("object:scaling", snapping);

  canvas.on("before:render", () => {
    if (canvas.contextTop) canvas.clearContext(canvas.contextTop);
  });

  canvas.on("after:render", () => {
    vLines.forEach(drawVerticalLine);
    hLines.forEach(drawHorizontalLine);
    crossMarks.forEach(({ x, y }) => drawCross(x, y));
    vLines.length = hLines.length = crossMarks.length = 0;
  });

  canvas.on("mouse:up", () => {
    vLines.length = hLines.length = crossMarks.length = 0;
    canvas.renderAll();
  });
}
