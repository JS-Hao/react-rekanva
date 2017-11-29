import { Rekapi, Actor } from 'rekapi';
import _converter from './_converter';
import update from './update';
import add from './add';
import deleteFunc from './delete';
import play from './play';
import stop from './stop';
import reset from './reset';
import end from './end';
import combine from './combine';
import to from './to';

export class Rekanva {
	constructor(options) {
		const {
			target,
			easing = 'linear',
			duration = 1000,
			initOpt,

			onStop,
			onPlay,
			onPause,
			onEnd,
			onReset,

			...props } = options;

		this.id = this._getHash();
		this.options = options;
		this.target = target;
		this.initOpt = initOpt || {};
		this.attrs = Object.assign({}, target.attrs, this.initOpt);
		this.easing = easing;
		this.duration = duration;
		this.animOpt = props;
		this.rekapi = new Rekapi(document.createElement('canvas').getContext('2d'));
		this.pathTimeline = null;

		this.onStop = [];
		this.onPlay = [];
		this.onPause = [];
		this.onEnd = [];
		this.onReset = [];
		this.state = 'init';

		const { path, timeline, ...base } = this.animOpt;
		this.animOpt = base;
		if (path) {
			this.pathTimeline = path(this.duration, this.attrs.x, this.attrs.y);
		} else {
			this.pathTimeline = null;
		}
		if (timeline) {
			this.specialTimeline = this._addSpecialTimeline(timeline);
		} else {
			this.specialTimeline = null;
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
		this.specialTimeline && this.actor.importTimeline(this.specialTimeline);

		this.rekapi.addActor(this.actor);
		this.queue = [ [ this ] ];

		// 事件监听
		this._isFunction(onStop) && this.onStop.push(onStop);
		this._isFunction(onPlay) && this.onPlay.push(onPlay);
		this._isFunction(onPause) && this.onPause.push(onPause);
		this._isFunction(onEnd) && this.onEnd.push(onEnd);
		this._isFunction(onReset) && this.onReset.unshift(onReset);

		this.rekapi.on('stop', () => {
			this.onStop.map(func => func.call(this));
		});
		this.rekapi.on('play', () => {
			this.onPlay.map(func => func.call(this));
		});
		this.rekapi.on('pause', () => {
			this.onPause.map(func => func.call(this));
		});
		this.rekapi.on('animationComplete', () => {
			this.onEnd.map(func => func.call(this));
		});
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

	_addSpecialTimeline(timeline) {
		const actor = new Actor();
		for (const index in timeline) {
			let frame;
			const converter = this._toConvert(timeline[index]);
			if (index.indexOf('%') !== -1) {
				frame = parseFloat(index) / 100 * this.duration;
			} else {
				frame = parseFloat(index) * this.duration;
			}
			actor.keyframe(frame, this._getState('end', converter));
		}
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
		// console.log('关键词', converter)
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
			case 'clipX':
			case 'clipY':
			case 'clipWidth':
			case 'clipHeight':
			case 'opacity':
			case 'x2':
			case 'y2':

				const newKey = key === 'x2' ? 'x' : (key === 'y2' ? 'y' : key);
				// key = key === 'x2' ? 'x' : key;
				// key = key === 'y2' ? 'y' : key;
				(this.attrs[newKey] === undefined) && (this.attrs[newKey] = 1);
				(converter !== undefined) ? (state[newKey] = converter - this.attrs[newKey]) : (state[newKey] = 0);
				break;

			default:
				(converter !== undefined ) ? (state[key] = converter) : (state[key] = 0);
				break;
		}
	}

	_to(target, attr) {
		target.setAttrs(attr);
		const layer = target.getLayer();
		layer.batchDraw();
	}

	_render(target, state, attrs) {
		const newState = {};
		const that = this;
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
					that._to(target, {
						[key]: (newState[key] + attrs[key])
					});
			}
		}
	}

	_addEndState(func) {
		this.onEnd.push(func);
	}

	_initAttrs(attrs) {
		for (const key in this.converter) {
			if (this.attrs[key] === undefined) {
				this.target.attrs[key] === undefined ? (this.attrs[key] = 1) : (this.attrs[key] = this.target.attrs[key])
			}
		}
	}

	_getLastItem(arr) {
		let maxTime, lastItem;
		arr.map(item => {
			const duration = item.duration;
			if (maxTime) {
				if (duration >= maxTime) {
					maxTime = duration;
					lastItem = item;
				}
			} else {
				maxTime = duration;
				lastItem = item;
			}
		})
		return lastItem;
	}

	_updateAttrs() {
		this.attrs = Object.assign({}, this.target.attrs, this.initOpt);
		this._initAttrs();
	}

	_updatePlayQueue() {
		const reverse = this.queue.concat().reverse();
		reverse.map((item, key) => {
			// 当最后一组动画的duration最长的动画执行完毕后，将状态置位end
			if (key === 0) {
				const lastItem = this._getLastItem(item);
				lastItem._addEndState(() => {
					this.state = 'end';
				})
			}
			if (reverse[key + 1]) {

				// 解除上一个动画onStop事件的所有事件绑定
				reverse[key + 1][0].rekapi.off('stop');
				// 重新绑定
				reverse[key + 1][0].rekapi.on('stop', () => {
					reverse[key + 1][0].onStop.map(func => func.call(this));
				});
				// 关联前后两个动画
				reverse[key + 1][0].rekapi.on('stop', () => {
					reverse[key].map(rekanva => rekanva.rekapi.play(1));
				});
				
			}
		})
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
				case 'clipX':
				case 'clipY':
				case 'clipHeight':
				case 'clipWidth':
				case 'opacity':
				case 'x2':
				case 'y2':
					const newKey = key === 'x2' ? 'x' : (key === 'y2' ? 'y' : key);
					state[newKey] = converter[newKey];
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

		// 如果能从path中拿到所有的路径坐标，而不是在遍历中一个一个地getPointAtLength，
		// 那么这边的计算速度会大大提升
		// getPointSetFromPath(path)

		for (let time = 0; time <= count; time++) {
			const x = parseInt(pathElement.getPointAtLength(curLength).x);
			const y = parseInt(pathElement.getPointAtLength(curLength).y);
			actor.keyframe(time * (1000 / 60), { x, y });
			curLength += step;
		}
		return actor.exportTimeline();
	}
}

Rekanva._extends = function(name, func) {
	this.prototype[name] = func;
}

const extendsList = { update, add, delete: deleteFunc, play, stop, reset, end, combine, to, }

for (const name in extendsList) {
	Rekanva._extends(name, extendsList[name]);
}
// Rekanva._extends('update', update);
// Rekanva._extends('add', add);
// Rekanva._extends('delete', deleteFunc);
// Rekanva._extends('play', play);
// Rekanva._extends('stop', stop);
// Rekanva._extends('reset', reset);
// Rekanva._extends('end', end);
// Rekanva._extends('combine', combine);
// Rekanva._extends('to', to);