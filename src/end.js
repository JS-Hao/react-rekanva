export default function end() {
	switch (this.state) {
		case 'playing':
			let index;
			this.queue.map((item, key1) => {
				item.map((rekanva, key2) => {
					const rekapi = rekanva.rekapi;
					if (rekapi.isPlaying()) {

						if (key2 === 0) {
							// 更新当前动画队列的index
							index = key1 + 1;
							// 解除所有stop事件的绑定
							rekapi.off('stop');
							rekapi.stop();
							// 重新绑定
							rekapi.on('stop', () => {
								rekanva.onStop.map(func => func.call(this));
							});
							this.queue[key1 + 1] && rekapi.on('stop', () => {
								this.queue[key1 + 1].map(nextRekanva => nextRekanva.rekapi.play(1));
							});
							// 更新target到end状态
							// rekanva.target.to(Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter), { duration: -1 }));
							this._to(rekanva.target, Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter)));
							// rekanva.target.setAttrs(Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter)));
							// 触发traget的onEnd事件
							rekanva.onEnd.map(func => func.call(this));

						} else {
							rekapi.off('stop');
							rekapi.stop();
							rekapi.on('stop', () => {
								rekanva.onStop.map(func => func.call(this));
							});
							// rekanva.target.to(Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter), { duration: -1 }));
							this._to(rekanva.target, Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter)));
							// rekanva.target.setAttrs(Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter)));
							rekanva.onEnd.map(func => func.call(this));
						}

					} else if (index !== undefined && key1 >= index) {
						// rekanva.target.to(Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter), { duration: -1 }));
						this._to(rekanva.target, Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter)));
						// rekanva.target.setAttrs(Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter)));
						rekanva.onEnd.map(func => func.call(this));

					} else {
						return;
					}
				})
			})
			break;

		case 'init':
			this.queue.map(item => {
				item.map(rekanva => {
					// rekanva.target.to(Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter), { duration: -1 }));
					this._to(rekanva.target, Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter)));
					// rekanva.target.setAttrs(Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter)));
					rekanva.onEnd.map(func => func.call(this));
				})
			})
			break;

		case 'end':
		default:
			break;
	}
	this.state = 'end';
}