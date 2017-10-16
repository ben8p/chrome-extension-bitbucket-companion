export default function (target, type, callback, useCapture) {
	target.addEventListener(type, callback, !!useCapture);
}
