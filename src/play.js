export default function play() {
	this.state = 'playing';
	this._updateAttrs();
	this._updatePlayQueue();
	this.queue[0].map(rekanva => rekanva.rekapi.play(1));
}