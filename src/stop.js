export default function stop() {
	this.queue.map((item, key1) => {
		item.map((rekanva, key2) => {
			const rekapi = rekanva.rekapi;
			if (rekapi.isPlaying()) {
				if (key2 === 0) {
					// 解除所有stop事件的绑定
					rekapi.off('stop');
					rekapi.stop();
					// 手动触发onStop事件
					//rekanva.onStop && rekanva.onStop();
					rekanva.onStop.map(func => func.call(this));
					// 重新绑定
					rekapi.on('stop', () => {
						rekanva.onStop.map(func => func.call(this));
					});
					this.queue[key1 + 1] && rekapi.on('stop', () => {
						this.queue[key1 + 1].map(nextRekanva => nextRekanva.rekapi.play(1));
					});
				} else {
					rekapi.stop();
				}
			}
		})
	})
}