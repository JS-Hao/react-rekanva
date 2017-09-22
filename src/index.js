import { Rekapi, Actor } from 'rekapi';

const _converter = {
	'translateX':  'x',
	'translateY':  'y',
	'scale'     :  ['scaleX', 'scaleY'],
	'scaleX'    :  'scaleX',
	'scaleY'    :  'scaleY',
	'opacity'   :  'opacity',
	'width'     :  'width',
	'height'    :  'height',
	'rotate'    :  'rotate'
}

export class Rekanva {
	constructor(options) {
		const { target, easing = 'linear', duration = 1000, onStop, onPlay, onPause, onEnd, onReset, ...props } = options;
		this.id = this._getHash();
		this.target = target;
		this.attrs = Object.assign({}, target.attrs);
		this.easing = easing;
		this.duration = duration;
		this.animOpt = props;
		this.rekapi = new Rekapi(document.createElement('canvas').getContext('2d'));
		this.pathTimeline = null;
		this.onStop = onStop;
		this.onPlay = onPlay;
		this.onPause = onPause;
		this.onEnd = onEnd;
		this.onReset = onReset;

		if (this.animOpt.path) {
			const { path, ...others } = this.animOpt;
			this.animOpt = others;
			this.pathTimeline = path(this.duration, this.attrs.x, this.attrs.y);
		}

		this.converter = this._toConvert(this.animOpt);
		this.tracks = Object.keys(this.converter);

		this.actor = new Actor({
			render: (context, state) => {
				this._render(this.target, state, this.attrs);
			}
		});

		this.actor.importTimeline(this._addTimeline(this.converter));
		this.pathTimeline && this.actor.importTimeline(this.pathTimeline);
		this.rekapi.addActor(this.actor);
		this.queue = [ [ this ] ];

		// 事件监听
		this._isFunction(this.onStop) && this.rekapi.on('stop', this.onStop.bind(this));
		this._isFunction(this.onPlay) && this.rekapi.on('play', this.onPlay.bind(this));
		this._isFunction(this.onPause) && this.rekapi.on('pause', this.onPlay.bind(this));
		this._isFunction(this.onEnd) && this.rekapi.on('animationComplete', this.onEnd.bind(this));
		// this._isFunction(this.onReset) && this.rekapi.on('reset', this.onReset.bind(this));
	}

	_getHash() {
		return Date.now() + '-' + parseInt(Math.random() * 1000);
	}

	_addTimeline(converter, isAnother) {
		const actor = new Actor();
		actor
			.keyframe(0, this._getState('start', converter, isAnother))
			.keyframe(this.duration, this._getState('end', converter, isAnother));
		return actor.exportTimeline();
	}

	_isFunction(func) {
		return func && (typeof func === 'function');
	}

	_toConvert(animOpt) {
		const converter = {};
		for (const key in animOpt) {
			if (typeof _converter[key] === 'string') {
				converter[_converter[key]] = animOpt[key];

			} else if (Array.isArray(_converter[key])) {
				_converter[key].map(item => {
					converter[item] = animOpt[key];
				})
			}
			
		}
		return converter
	}

	_getState(moment, converter, isAnother) {
		const state = {};
		for (let key in converter) {
			if (isAnother && this.tracks.indexOf(key) !== -1) {
				key = key + '&' + this.id;
			} else if(isAnother && moment === 'end') { // 仅在结尾处更新tracks
				this.tracks.push(key);
			}

			if (moment === 'start') {
				this._setAttributes(state, key);
			} else if (moment === 'end') {
				this._setAttributes(state, key, converter[key.split('&')[0]])
			}
 		}
 		return state;
	}

	_setAttributes(state, key, converter) {
		switch (key.split('&')[0]) {
			case 'scaleX':
			case 'scaleY':
			case 'width':
			case 'height':
				(this.attrs[key] === undefined) && (this.attrs[key] = 1);
				(converter !== undefined) ? (state[key] = converter - this.attrs[key]) : (state[key] = 0);
				break;

			default: 
				(converter !== undefined ) ? (state[key] = converter) : (state[key] = 0);
				break;
		}
	}

	_render(target, state, attrs) {
		const newState = {};
		for (const key in state) {
			const newKey = key.split('&')[0];
			newState[newKey] = newState[newKey] ? newState[newKey] + state[key] : state[key];
		}
		for (const key in newState) {
			switch (key) {
				case 'rotate':
					target.rotation(newState[key]);
					break;
				default:
					console.log(newState[key], attrs[key], (newState[key] + attrs[key]))
					target.to({[key]: (newState[key] + attrs[key]), duration: -1});
			}
		}
	}

	_addEndState() {
		if (this.onStop) {
			const onStop = this.onStop.bind(this);
			this.onStop = () => {
				onStop();
				this.state = 'end';
			};
		} else {
			this.onStop = () => {
				this.state = 'end';
			}
		}
	}

	play() {
		this.state = 'playing';

		const reverse = this.queue.concat().reverse();
		reverse.map((item, key) => {
			// 当最后一组动画的第一个动画执行完毕后，将状态置为end；
			if (key === 0) {
				item[0]._addEndState();
			}
			if (reverse[key + 1]) {
				reverse[key + 1][0].rekapi.on('stop', () => {
					reverse[key].map(rekanva => rekanva.rekapi.play(1));
				})
			}
		});
		this.queue[0].map(rekanva => rekanva.rekapi.play(1));
	}

	stop() {
		this.queue.map((item, key1) => {
			item.map((rekanva, key2) => {
				const rekapi = rekanva.rekapi;
				if (rekapi.isPlaying()) {
					if (key2 === 0) {
						// 解除所有stop事件的绑定
						rekapi.off('stop');
						rekapi.stop();
						// 手动触发onStop事件
						rekanva.onStop && rekanva.onStop();
						// 重新绑定
						rekanva.onStop && rekapi.on('stop', rekanva.onStop);
						item[key1 + 1] && rekapi.on('stop', () => {
							item[key1 + 1].map(nextRekanva => nextRekanva.rekapi.play(1));
						});
					} else {
						rekapi.stop();	
					}
				}
			})
		})
	}

	reset() {
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
								rekanva.onStop && rekapi.on('stop', rekanva.onStop);
								item[key1 + 1] && rekapi.on('stop', () => {
									item[key1 + 1].map(nextRekanva => nextRekanva.rekapi.play(1));
								});
								// 更新target到reset状态
								rekanva.target.to(Object.assign({}, this._getInitState(rekanva.attrs, rekanva.converter), { duration: -1 }));
								// 触发target的onReset事件
								rekanva.onReset && rekanva.onReset();

							} else {
								rekapi.off('stop');
								rekapi.stop();
								rekanva.onStop && rekapi.on('stop', rekanva.onStop);
								rekanva.target.to(Object.assign({}, this._getInitState(rekanva.attrs, rekanva.converter), { duration: -1 }));
								rekanva.onReset && rekanva.onReset();
							}

						} else if (index === undefined || key1 <= index) {
							rekanva.target.to(Object.assign({}, this._getInitState(rekanva.attrs, rekanva.converter), { duration: -1 }));
							rekanva.onReset && rekanva.onReset();

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
						rekanva.target.to(Object.assign({}, this._getInitState(rekanva.attrs, rekanva.converter), { duration: -1 }));
						rekanva.onReset && rekanva.onReset();
					});
				})
				break;
		}
		this.state = 'init';
	}

	end() {
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
								rekanva.onStop && rekapi.on('stop', rekanva.onStop);
								item[key1 + 1] && rekapi.on('stop', () => {
									item[key1 + 1].map(nextRekanva => nextRekanva.rekapi.play(1));
								});
								// 更新target到end状态
								rekanva.target.to(Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter), { duration: -1 }));
								// 触发traget的onEnd事件
								rekanva.onEnd && rekanva.onEnd();

							} else {
								rekapi.off('stop');
								rekapi.stop();
								rekanva.onStop && rekapi.on('stop', rekanva.onStop);
								rekanva.target.to(Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter), { duration: -1 }));
								rekanva.onEnd && rekanva.onEnd();
							}

						} else if (index !== undefined && key1 >= index) {
							rekanva.target.to(Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter), { duration: -1 }));
							rekanva.onEnd && rekanva.onEnd();

						} else {
							return;
						}
					})
				})
				break;

			case 'init':
				this.queue.map(item => {
					item.map(rekanva => {
						rekanva.target.to(Object.assign({}, this._getEndState(rekanva.attrs, rekanva.converter), { duration: -1 }));
						rekanva.onEnd && rekanva.onEnd();
					})
				})
				break;

			case 'end':
			default:
				break;
		}
		this.state = 'end';
	}

	_getInitState(attrs, converter) {
		const state = {};
		for (const key in converter) {
			state[key] = attrs[key];
		}
		return state;
	}

	_getEndState(attrs, converter) {
		const state = {};
		for (const key in converter) {
			switch (key) {
				case 'scaleX':
				case 'scaleY':
				case 'width':
				case 'height':
					state[key] = converter[key];
					break;

				default:
					state[key] = converter[key] + attrs[key];
					break;
			}
		}
		return state;
	}

  // 获取两条timeline，当timeline有重复定义的track定义时，将相同的track合并到nextTimeline上，并删除lastTimeline的同名track
	_combineTimeline(lastTimeline, nextTimeline) {
		const lastTrackNames = lastTimeline.trackNames;
		const nextTrackNames = nextTimeline.trackNames;
		lastTrackNames.map(name => {
			const key = name.split('&')[0];
			const index = nextTrackNames.indexOf(key);
			if ( index !== -1) {
				nextTimeline.trackNames.splice(index, 1, key + '&' + this.id);
				const propertyTrack = nextTimeline.propertyTracks[key];
				delete nextTimeline.propertyTracks[key];
				nextTimeline.propertyTracks[key + '&' + this.id] = propertyTrack;
				nextTimeline.propertyTracks[key + '&' + this.id].map(item => {
					item.name = key + '&' + this.id;
				})
			}
		});
		return { lastTimeline, nextTimeline }
	}

	/**
	 * combine 结合上一个动画
	 * @param { object } options 动画配置
	 * @param { object } options.target 动画元素, 默认为上一个动画元素
	 * @param { number } options.duration 运动时间, 默认为1s
	 * @param { string } options.easing 运动时间函数, 默认为上一个动画easing
	 * @param { object } { ...options.props } 动画属性
	 * @return { object } Rekanva实例
	 *
	 * 在结合同一个元素的两个动画时，要注意duration这个属性，当前后两个动画含有同名track(例如，两个动画都改变元素的x坐标)时，
	 * duration应保持一致，否则我们无法对同名track进行合并处理
	 */
	combine(options) {
		const { target = this.target, duration = this.duration, easing = this.easing, ...props } = options;
		if (target === this.target) {
			this.id = this._getHash();
			this.duration = duration;
			this.easing = easing;	

			if (props.path) {
				const { path, ...others } = props;
				this.converter = this._toConvert(others);
				this.pathTimeline = path(this.duration, this.attrs.x, this.attrs.y);
			} else {
				this.pathTimeline = null;
				this.converter = this._toConvert(props);
			}

			this.rekapi.removeActor(this.actor);

			const nextTimeline = (() => {
				const actor = new Actor();
				actor.importTimeline(this._addTimeline(this.converter));

				this.pathTimeline && actor.importTimeline(this.pathTimeline);
				return actor.exportTimeline();
			})();
			console.log(nextTimeline)

			const lastTimeline = this.actor.exportTimeline();
			const timelines = this._combineTimeline(lastTimeline, nextTimeline);
			this.actor.removeAllKeyframes();
			this.actor.importTimeline(timelines.lastTimeline);
			this.actor.importTimeline(timelines.nextTimeline);
			

			this.rekapi.addActor(this.actor);

		} else {
			const rekanva = new Rekanva(Object.assign({}, options, { target, duration, easing }));
			this.queue[this.queue.length - 1].push(rekanva);
		}
		return this;
	}

	to(options) {
		const { target = this.target, duration = this.duration, easing = this.easing } = options;
		const rekanva = new Rekanva(Object.assign({}, options, { target, duration, easing }));
		this.queue.push([ rekanva ]);
		return this;

	}
}

export function Path(path) {
	const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path'); 
	pathElement.setAttributeNS(null, 'd', path);

	return function(duration) {
		const length = parseInt(pathElement.getTotalLength());
		const count = duration / 1000 * 60; // 帧数
		const step = length / count; // 步长
		const actor = new Actor();
		let curLength = 0; // 当前长度

		for (let time = 0; time <= count; time++) {
			const x = parseInt(pathElement.getPointAtLength(curLength).x);
			const y = parseInt(pathElement.getPointAtLength(curLength).y);
			actor.keyframe(time * (1000 / 60), { x, y });
			curLength += step;
		}

		return actor.exportTimeline();
	}
}