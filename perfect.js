import { getStroke } from "https://cdn.skypack.dev/perfect-freehand"


document.addEventListener('DOMContentLoaded', (e) => {
	let points = [];
	const svg = document.querySelector('svg');
	const path = svg.querySelector('path');
	
	function render() {
		path.setAttribute('d', getSvgPathFromStroke(
            getStroke(points, {
              size: 16,
              thinning: 0.5,
              smoothing: 0.5,
              streamline: 0.5,
            })
          )
				);
	}
	
	function handlePointerDown(e) {
		points = [[e.pageX, e.pageY, e.pressure]];
		render();
	}

	function handlePointerMove(e) {
		if (e.buttons === 1) {
			points = [...points, [e.pageX, e.pageY, e.pressure]];
			render();
		}
	}

	function handleMouseUp(){
		const activeLayer = paper.project.activeLayer
		const groupObj = activeLayer.importSVG(svg, {insert: false});
		const svgPathObj = groupObj.children[0]
		svgPathObj.selected = true
		svgPathObj.name="svg"
		if(svgPathObj){
			activeLayer.addChild(svgPathObj);
		}
		path.setAttribute('d', '')
	}
	
	svg.addEventListener('pointerdown', handlePointerDown);
	svg.addEventListener('pointermove', handlePointerMove);
	svg.addEventListener('pointerup', handleMouseUp);
});