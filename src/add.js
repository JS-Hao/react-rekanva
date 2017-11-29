function add() {
	const argu = Array.from(arguments);
	const len = argu.length;
	if (len === 1) {
		const rekanva = argu[0];
		rekanva instanceof Rekanva && this.queue.push([rekanva]);
	} else {
		const index = (typeof argu[0] === 'number') ? argu[0] : this.queue.length;
		const rekanva = argu[1];
		rekanva instanceof Rekanva && this.queue.splice(index, 0, rekanva);
	}
}

export default add;