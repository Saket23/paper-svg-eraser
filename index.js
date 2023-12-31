paper.install(window);

let tool = null;
let path;
let pencil = {};

let options = {
  drawWidth: 10,
  eraseWidth: 50,
  drawColor: "#000000",
  toolSelect: "draw",
  clearCanvas: function () {
    topLayer.removeChildren();
  },
};

function preparePath(path, resolve) {
  var res = path
    .clone(false)
    .reduce({ simplify: true })
    .transform(null, true, true);
  if (resolve) {
    var paths = getPaths(res);
    for (var i = 0, l = paths.length; i < l; i++) {
      var path = paths[i];
      if (!path._closed && !path.isEmpty()) {
        path.closePath(1e-12);
        path.getFirstSegment().setHandleIn(0, 0);
        path.getLastSegment().setHandleOut(0, 0);
      }
    }
    res = res
      .resolveCrossings()
      .reorient(res.getFillRule() === "nonzero", true);
  }
  return res;
}

function filterIntersection(inter) {
  return inter.hasOverlap() || inter.isCrossing();
}

function createResult(paths, simplify, path1, path2, options) {
  var result = new CompoundPath(Item.NO_INSERT);
  paths.forEach(element => {
    element.setClosed(true)
  });
  result.addChildren(paths, true);
  result = result.reduce({ simplify: simplify });
  if (!(options && options.insert == false)) {
    result.insertAbove(
      path2 && path1.isSibling(path2) && path1.getIndex() < path2.getIndex()
        ? path2
        : path1,
    );
  }
  result.copyAttributes(path1, true);
  return result;
}


const subtract = (item, deleteShape, options) => {
  const path1 = preparePath(item);
  const path2 = preparePath(deleteShape);
  const crossings = path1.getIntersections(path2, filterIntersection);
  const paths = [];
  const added = {}

  function addPath(path) {
    if (
      !added[path._id] &&
      path2.contains(path.getPointAt(path.getLength() / 2)) ^ true
    ) {
      paths.unshift(path);
      return (added[path._id] = true);
    }
  }

  for (var i = crossings.length - 1; i >= 0; i--) {
    var path = split(crossings[i]);
    if (path) {
      if (addPath(path)) path.getFirstSegment().setHandleIn(0, 0);
      path1.getLastSegment().setHandleOut(0, 0);
    }
  }
  addPath(path1);
  return createResult(paths, false, path1, path2);
};

const pathSplitAt = (path1, location) => {
  var loc = path1.getLocationAt(location),
      index = loc && loc.index,
      time = loc && loc.time,
      tMin = 1e-8,
      tMax = 1 - tMin;
  if (time > tMax) {
      index++;
      time = 0;
  }
  var curves = path1.getCurves();
  if (index >= 0 && index < curves.length) {
      if (time >= tMin) {
          curves[index++].divideAtTime(time);
      }
      var segs = path1.removeSegments(index, path1._segments.length, true),
          path;
      if (path1._closed) {
          path1.setClosed(false);
          path = path1;
      } else {
          path = new Path(Item.NO_INSERT);
          path.insertAbove(path1);
          path.copyAttributes(path1);
      }
      path._add(segs, 0);
      path1.addSegment(segs[0]);
      return path;
  }
  return null;
}

const splitAt = function(curve, location) {
  const  path = curve._path;
  return path ? pathSplitAt(path, location) : null;
}

const splitAtTime = (curve, time) => {
  return splitAt(curve, curve.getLocationAtTime(time));
}

const split = (curveLocation) => {
  const curve = curveLocation.getCurve();
  const path = curve._path;
  const res = curve && splitAtTime(curve, curveLocation.getTime());
  if (res) {
    curveLocation._setSegment(path.getLastSegment());
  }
  return  res;
}

const handlePaint = () => {
  const topLayer = paper.project.activeLayer;
  const svg = document.getElementById("freehand-canvas");
  svg.classList.add("svg-index-0");
  svg.classList.remove("svg-index-1");
  let svgPath;

  tool?.remove();

  tool = new Tool();

  // Define a mousedown and mousedrag handler
  tool.onMouseDown = function (event) {
    svgPath = paper.project.activeLayer.children[0];
    path = new Path();
    path.strokeWidth = 10;
    path.strokeColor = "orange";
    path.selected = true;
    path.add(event.point);
  };

  tool.onMouseDrag = function (event) {
    path.add(event.point);
  };

  tool.onMouseUp = function () {
    let pathObj = {
      paperObj: path.exportJSON({ precision: 2 }),
    };

    const value = svgPath.getIntersections(path);
  };
};

const handlePenClick = (val) => {
  const svg = document.getElementById("freehand-canvas");
  svg.classList.add("svg-index-1");
  svg.classList.remove("svg-index-0");
};

const handleNormalPenClick = () => {
  const svg = document.getElementById("freehand-canvas");
  svg.classList.add("svg-index-0");
  svg.classList.remove("svg-index-1");

  tool?.remove();

  tool = new Tool();

  // Define a mousedown and mousedrag handler
  tool.onMouseDown = function (event) {
    path = new Path();
    path.name = "saket";
    path.selected = true;
    path.strokeColor = "black";
    path.strokeWidth = 10;
    path.add(event.point);
  };

  tool.onMouseDrag = function (event) {
    path.add(event.point);
  };

  tool.onMouseUp = function () {
    let pathObj = {
      paperObj: path.exportJSON({ precision: 2 }),
    };
    console.log(pathObj);
  };
};

const handleEraserClick = (val) => {
  const svg = document.getElementById("freehand-canvas");
  svg.classList.add("svg-index-0");
  svg.classList.remove("svg-index-1");

  var path, tmpGroup, mask;
  tool?.remove();

  tool = new Tool();
  tool.minDistance = 10;

  // Define a mousedown and mousedrag handler
  tool.onMouseDown = function (event) {
    path = new Path({
      strokeWidth: options.eraseWidth * view.pixelRatio,
      strokeCap: "round",
      strokeJoin: "round",
      strokeColor: "white",
    });

    const topLayer = paper.project.activeLayer;

    // learned about this blend stuff from this issue on the paperjs repo:
    // https://github.com/paperjs/paper.js/issues/1313

    // move everything on the active layer into a group with 'source-out' blend
    tmpGroup = new Group({
      children: topLayer.removeChildren(),
      blendMode: "source-out",
      insert: false,
    });

    // combine the path and group in another group with a blend of 'source-over'
    mask = new Group({
      children: [path, tmpGroup],
      blendMode: "source-over",
    });
  };

  tool.onMouseDrag = function (event) {
    path.add(event.point);
  };

  tool.onMouseUp = function () {
    const topLayer = paper.project.activeLayer;

    path.simplify();

    var eraseRadius = (options.eraseWidth * view.pixelRatio) / 2;

    // find the offset path on each side of the line
    // this uses routines in the offset.js file
    var outerPath = OffsetUtils.offsetPath(path, eraseRadius);
    var innerPath = OffsetUtils.offsetPath(path, -eraseRadius);
    path.remove();

    outerPath.insert = false;
    innerPath.insert = false;
    innerPath.reverse();

    var deleteShape = new Path({
      closed: true,
      insert: false,
      name: "delete",
    });
    deleteShape.addSegments(outerPath.segments);
    deleteShape.addSegments(innerPath.segments);

    // grab all the items from the tmpGroup in the mask group
    var items = tmpGroup.getItems({ overlapping: deleteShape.bounds });

    items.forEach(function (item) {
      var result = subtract(item, deleteShape, {
        trace: false,
        insert: false,
      });

      // var result = item.subtract(deleteShape, {
      //   trace: false,
      //   insert: false,
      // })

      if (result.children) {
        // if result is compoundShape, yoink the individual paths out
        item.parent.insertChildren(item.index, result.children);
        item.remove();
      } else {
        if (result.length === 0) {
          // a fully erased path will still return a 0-length path object
          item.remove();
        } else {
          item.replaceWith(result);
        }
      }
    });

    topLayer.addChildren(tmpGroup.removeChildren());
    mask.remove();
  };
};

window.onload = function () {
  //canvas
  paper.setup("myCanvas");
  // Create a simple drawing tool:
  let layer = new Layer();
  layer.name = "paper";
  layer.activate();

  handlePenClick();
};

function getSvgPathFromStroke(stroke) {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"],
  );

  d.push("Z");
  return d.join(" ");
}
