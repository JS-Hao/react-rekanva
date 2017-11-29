function update(data) {
	const converter = Object.assign({}, this.converter, data);
	this.attrs = Object.assign({}, this.target.attrs, this.initOpt);
	this._initAttrs();
	this.rekapi.removeActor(this.actor);
	this.actor.removeAllKeyframes();

	this.actor.importTimeline(this._addTimeline(converter));
	this.pathTimeline && this.actor.importTimeline(this.pathTimeline);
	this.specialTimeline && this.actor.importTimeline(this.specialTimeline);
	this.rekapi.addActor(this.actor);
}

export default update;