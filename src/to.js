export default function to(options) {
	const { target = this.target, duration = this.duration, easing = this.easing } = options;
	const rekanva = new this.constructor(Object.assign({}, options, { target, duration, easing }));
	this.queue.push([ rekanva ]);
	return this;
}