export default function reset() {
	const resetQueue = [];
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
								this.queue[key1 + 1].map(nextRekanva => {
									nextRekanva._updateTimeline();
									nextRekanva.rekapi.play(1);
								});
							});
							// 更新target到reset状态
							this._to(rekanva.target, Object.assign({}, this._getInitState(rekanva.attrs, rekanva.converter)));
							// 触发target的onReset事件
							resetQueue.unshift(() => {
								rekanva.onReset.map(func => func.call(this));
							})

						} else {
							rekapi.off('stop');
							rekapi.stop();
							rekapi.on('stop', () => {
								rekanva.onStop.map(func => func.call(this));
							});
							this._to(rekanva.target, Object.assign({}, this._getInitState(rekanva.attrs, rekanva.converter)));
							resetQueue.unshift(() => {
								rekanva.onReset.map(func => func.call(this));
							})
						}

					} else if (index === undefined || key1 <= index) {
						this._to(rekanva.target, Object.assign({}, this._getInitState(rekanva.attrs, rekanva.converter)));
						resetQueue.unshift(() => {
							rekanva.onReset.map(func => func.call(this));
						})

					} else {
						return;
					}
				});
			});
			break;

		case 'init':
			break;

		case 'end':
		default:
			this.queue.map(item => {
				item.map(rekanva => {
					this._to(rekanva.target, Object.assign({}, this._getInitState(rekanva.attrs, rekanva.converter)));
					resetQueue.unshift(() => {
						rekanva.onReset.map(func => func.call(this));
					})
				});
			})
			break;
	}

	// 执行所有回调函数
	resetQueue.map(func => func());
	this.state = 'init';
}