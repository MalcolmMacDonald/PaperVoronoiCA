var voronoi = new Voronoi();
var currentSites = generateBeeHivePoints(view.size / 150, false);
var bbox, diagram;
var oldSize = view.size;
var spotColor = new Color('red');
var mousePos = view.center;
var selected = false;
var bbRectangle;


onResize();

function getSite() {
    var currentCellData = {
        site: new Point(),
        area: 0,
        neighbors: [],
        shape: [],
        value: 0
    };
    return currentCellData;
}


function onMouseDown(event) {
    var newSite = getSite();
    newSite.site = event.point;
    newSite.value = 1;
    currentSites.push(newSite);
    renderDiagram();
}

function onFrame(event) {
    var sitePoints = currentSites.flatMap(function (site) {
        return site.site;
    })

    var diagram = voronoi.compute(sitePoints, bbox);
    if (diagram) {

        calculateDiagram(diagram);
        updateDiagram();
        renderDiagram(diagram);
    }

}

var shown = false;

function calculateDiagram(diagram) {


    for (var i = 0, l = currentSites.length; i < l; i++) {
        var cell = diagram.cells[currentSites[i].site.voronoiId];
        if (cell) {
            if (!currentSites[i].site) {
                currentSites[i].site = cell.site;
            }
            currentSites[i].shape = [];
            currentSites[i].area = 0;
            currentSites[i].neighbors = [];
            var halfedges = cell.halfedges,
                length = halfedges.length;


            if (length > 2) {
                for (var j = 0; j < length; j++) {
                    currentSites[i].area += new Point(halfedges[j].getStartpoint()).cross(new Point(halfedges[j].getEndpoint()));
                    if (halfedges[j].edge.lSite) {
                        var otherSite = halfedges[j].edge.rSite;
                        if (otherSite && !currentSites[i].neighbors.includes((otherSite.voronoiId))) {
                            currentSites[i].neighbors.push(otherSite.voronoiId);
                        }
                        otherSite = halfedges[j].edge.lSite;
                        if (otherSite && !currentSites[i].neighbors.includes((otherSite.voronoiId))) {
                            currentSites[i].neighbors.push(otherSite.voronoiId);
                        }
                    }
                    currentSites[i].shape.push(new Point(halfedges[j].getStartpoint()));
                }

            }
        }
    }
    for (var i = 0; i < currentSites.length; i++) {

        for (var j = 0; j < currentSites[i].neighbors.length; j++) {


            currentSites[i].neighbors[j] = currentSites.find(function (site) {
                return site.site.voronoiId === currentSites[i].neighbors[j];
            })

        }

    }

    var nextSites = currentSites.slice();

    for (var i = 0; i < currentSites.length; i++) {

        var total = 0;

        for (var j = 0; j < currentSites[i].neighbors.length; j++) {
            var difference = currentSites[i].value - currentSites[i].neighbors[j].value;
            difference = Math.pow(difference, 7);
            var current = currentSites[i].value / (currentSites[i].neighbors.length) * 0.3 * difference;
            nextSites[i].neighbors[j].value += current;
            total += current;
        }
        nextSites[i].value -= total * 2;
        nextSites[i].value = Math.min(Math.max(nextSites[i].value, 0), 1);
    }
    if (!shown) {
        console.log(nextSites);
        shown = true;
    }
    nextSites = nextSites.filter(function (site) {

        return bbRectangle.contains(site.site);
    });

    currentSites = nextSites.slice();
}


function getOffset(cellData) {

    var offset = new Point();

    for (var i = 0; i < cellData.shape.length; i++) {
        var pointVector = new Point((cellData.shape[i] - cellData.site));


        offset.x += pointVector.x;
        offset.y += pointVector.y;
    }

    for (var i = 0; i < cellData.neighbors.length; i++) {
        var difference = cellData.value - cellData.neighbors[i].value;
        // console.log(difference);
        var pointVector = cellData.neighbors[i].site - cellData.site;
        pointVector *= difference * -3;

        offset.x += pointVector.x;
        offset.y += pointVector.y;
    }

    offset /= cellData.shape.length;

    return offset;
}

function updateDiagram() {
    var offsets = [];

    for (var i = 0; i < currentSites.length; i++) {

        offsets[i] = getOffset(currentSites[i]);

    }


    for (var i = 0, l = currentSites.length; i < l; i++) {

        currentSites[i].site.x += offsets[i].x;
        currentSites[i].site.y += offsets[i].y;
    }
}

function renderDiagram(diagram) {
    project.activeLayer.children = [];
    var rect = new Path.Rectangle({
        point: [0, 0],
        size: [view.size.width, view.size.height],
       // strokeColor: 'white',
        selected: false
    });
    rect.sendToBack();
    rect.fillColor = '#000000';
    
    for (var i = 0, l = currentSites.length; i < l; i++) {
        if (currentSites[i].shape) {


            createPath(currentSites[i]);
            //for (var j = 0; j < adjacentCells.length; j++) {
            // var connectingLine = new Path();
            // connectingLine.add(cell.site);
            // connectingLine.add(adjacentCells[j]);
            // connectingLine.strokeColor = spotColor;

            //}
        }
    }

}

function removeSmallBits(path) {
    var averageLength = path.length / path.segments.length;
    var min = path.length / 50;
    for (var i = path.segments.length - 1; i >= 0; i--) {
        var segment = path.segments[i];
        var cur = segment.point;
        var nextSegment = segment.next;
        var next = nextSegment.point + nextSegment.handleIn;
        if (cur.getDistance(next) < min) {
            segment.remove();
        }
    }
}

function generateBeeHivePoints(size, loose) {
    var points = [];
    var col = view.size / size;
    for (var i = 0; i < size.width - 1; i++) {
        for (var j = 0; j < size.height - 1; j++) {
            var point = new Point(i, j) / new Point(size) * view.size + col / 2;
            if (j % 2)
                point += new Point(col.width / 2, 0);
            if (loose)
                point += (col / 4) * Point.random() - col / 4;


            var currentCellData = getSite();
            currentCellData.site = point;
            if (i == Math.floor(size.width / 2) && j == Math.floor(size.height / 2)) {
                currentCellData.value = 1;
            }

            points.push(currentCellData);
        }
    }
    return points;
}

function createPath(siteData) {
    var path = new Path();
    if (!selected) {
        path.fillColor = spotColor;
        //console.log(path.fillColor.hue);
    } else {
        path.fullySelected = selected;
    }

    path.closed = true;

    for (var i = 0, l = siteData.shape.length; i < l; i++) {
        var point = siteData.shape[i];
        var next = siteData.shape[(i + 1) == siteData.shape.length ? 0 : i + 1];
        var vector = (next - point) / 2;
        path.add({
            point: point + vector,
            handleIn: -vector,
            handleOut: vector
        });
    }
    path.fillColor.hue = siteData.area * 0.01;
    path.fillColor.brightness = siteData.value * 3.0;

    path.scale(0.95);
    removeSmallBits(path);
    return path;
}

function onResize() {
    var margin = 20;
    bbox = {
        xl: margin,
        xr: view.bounds.width - margin,
        yt: margin,
        yb: view.bounds.height - margin
    };

    bbRectangle = new Rectangle(new Point(bbox.xl, bbox.yb), new Point(bbox.xr, bbox.yt));
    for (var i = 0, l = currentSites.length; i < l; i++) {
        currentSites[i].site = currentSites[i].site * view.size / oldSize;
    }
    oldSize = view.size;
    renderDiagram();
}

function onKeyDown(event) {
    if (event.key == 'space') {
        selected = !selected;
        renderDiagram();
    }
}