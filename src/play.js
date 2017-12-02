import update from './update';
export default function play() {
	this.state = 'playing';
	// this._updateAttrs();
	// update.call(this);
	HAO.log(this.queue)
	this._updatePlayQueue();
	this.queue[0].map(rekanva => {
		rekanva._updateTimeline();
		rekanva.rekapi.play(1)
	});
}