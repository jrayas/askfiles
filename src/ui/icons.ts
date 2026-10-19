const SVG_NS = "http://www.w3.org/2000/svg";

export type AskfilesIconName =
	| "lock-open"
	| "lock-closed"
	| "gear"
	| "chevron-left"
	| "chevron-right"
	| "chevron-down"
	| "plus"
	| "close"
	| "folder"
	| "check";

/**
 * Renders a matching monochrome line icon into `container`.
 * All icons share a 24x24 viewBox, 1.75px stroke, round caps/joins, and `currentColor`
 * so they automatically appear black in light themes and white in dark themes.
 * Lock state is communicated strictly by shackle shape (never by colour).
 */
export function renderLineIcon(
	container: HTMLElement,
	icon: AskfilesIconName,
	size = 18,
): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("width", String(size));
	svg.setAttribute("height", String(size));
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", "currentColor");
	svg.setAttribute("stroke-width", "1.75");
	svg.setAttribute("stroke-linecap", "round");
	svg.setAttribute("stroke-linejoin", "round");
	svg.setAttribute("aria-hidden", "true");
	svg.classList.add("askfiles-line-icon", `askfiles-line-icon--${icon}`);

	const addPath = (d: string): void => {
		const p = document.createElementNS(SVG_NS, "path");
		p.setAttribute("d", d);
		svg.appendChild(p);
	};

	const addRect = (
		x: number,
		y: number,
		w: number,
		h: number,
		rx: number,
	): void => {
		const r = document.createElementNS(SVG_NS, "rect");
		r.setAttribute("x", String(x));
		r.setAttribute("y", String(y));
		r.setAttribute("width", String(w));
		r.setAttribute("height", String(h));
		r.setAttribute("rx", String(rx));
		svg.appendChild(r);
	};

	const addCircle = (cx: number, cy: number, r: number): void => {
		const c = document.createElementNS(SVG_NS, "circle");
		c.setAttribute("cx", String(cx));
		c.setAttribute("cy", String(cy));
		c.setAttribute("r", String(r));
		svg.appendChild(c);
	};

	switch (icon) {
		case "lock-open":
			// Matching padlock body + raised open shackle
			addRect(5, 11, 14, 10, 2);
			addPath("M8 11V7a4 4 0 0 1 7.75-1.35");
			addCircle(12, 16, 1);
			break;
		case "lock-closed":
			// Matching padlock body + closed shackle
			addRect(5, 11, 14, 10, 2);
			addPath("M8 11V7a4 4 0 0 1 8 0v4");
			addCircle(12, 16, 1);
			break;
		case "gear":
			// Matching 8-tooth line gear
			addCircle(12, 12, 3);
			addPath(
				"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
			);
			break;
		case "chevron-left":
			addPath("M15 18l-6-6 6-6");
			break;
		case "chevron-right":
			addPath("M9 18l6-6-6-6");
			break;
		case "chevron-down":
			addPath("M6 9l6 6 6-6");
			break;
		case "plus":
			addPath("M12 5v14M5 12h14");
			break;
		case "close":
			addPath("M18 6L6 18M6 6l12 12");
			break;
		case "folder":
			addPath(
				"M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
			);
			break;
		case "check":
			addPath("M20 6L9 17l-5-5");
			break;
	}

	container.appendChild(svg);
	return svg;
}
