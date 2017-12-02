function update(data) {
	data = data || {};
	this.converter = Object.assign({}, this.converter, data);
	this._updateTimeline();
}

export default update;