import { Rekapi, Actor } from 'rekapi';

const _converter = {
	'translateX': 'x',
	'translateY': 'y',
	'scale': ['scaleX', 'scaleY'],
	'scaleX': 'scaleX',
	'scaleY': 'scaleY'

}

export class Rekanva {
	constructor(options) {
		const { target, easing = 'linear', duration = 1000, ...props } = options;
		this.id = this._getHash();
		this.target = target;
		this.attrs = Object.assign({}, target.attrs);
		this.easing = easing;
		this.duration = duration;
		this.animOpt = props;
		this.rekapi = new Rekapi(document.createElement('canvas').getContext('2d'));
		this.pathTimeline = null;

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
		this.queue = [ [ this.rekapi ] ];

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

	_toConvert(animOpt) {
		const converter = {};
		for (let key in animOpt) {
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
		let state = {};
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
				(this.attrs[key] === undefined) && (this.attrs[key] = 1);
				converter ? (state[key] = converter - this.attrs[key]) : (state[key] = 0);
				break;

			default: 
				converter ? (state[key] = converter) : (state[key] = 0);
				break;
		}
	}

	_render(target, state, attrs) {
		const newState = {};
		for (let key in state) {
			let newKey = key.split('&')[0];
			newState[newKey] = newState[newKey] ? newState[newKey] + state[key] : state[key];
		}
		for (let key in newState) {
			target.to({[key]: (newState[key] + attrs[key]), duration: -1});
		}
	}

	play() {
		const reverse = this.queue.concat().reverse();
		reverse.map((item, key) => {
			if (reverse[key + 1]) {
				reverse[key + 1][0].on('stop', () => {
					reverse[key].map(rekapi => rekapi.play(1));
				})
			}
		});
		this.queue[0].map(rekapi => rekapi.play(1));
	}

	stop() {

	}

  // 获取两条timeline，当timeline有重复定义的track定义时，将相同的track合并到nextTimeline上，并删除lastTimeline的同名track
	_combineTimeline(lastTimeline, nextTimeline) {
		const lastTrackNames = lastTimeline.trackNames;
		const nextTrackNames = nextTimeline.trackNames;
		const sameTrackNames = [];

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

	// _combinePropertyTrack(lastPropertyTrack, nextPropertyTrack) {
	// 	const lastTrackMs = lastPropertyTrack.map(item => item.millisecond);
	// 	const nextTrackMs = nextPropertyTrack.map(item => item.millisecond);
	// 	const sameTrackMs = [], diffTrackMs = [];

	// 	const lastTrackObj = {};
	// 	lastPropertyTrack.map(item => {
	// 		lastTrackObj[item.millisecond] = item;
	// 	});	

	// 	lastTrackMs.map(item => {
	// 		if (nextTrackMs.indexOf(item) !== -1) {
	// 			sameTrackMs.push(item);
	// 		} else {	
	// 			diffTrackMs.push(item);
	// 		}
	// 	});
	// 	const newPropertyTrack = nextPropertyTrack;

	// 	// 合并相同帧的value
	// 	newPropertyTrack.map(item => {
	// 		if (sameTrackMs.indexOf(item.millisecond) !== -1) {
	// 			// 两个track的value叠加，将会多出一个target.attr
	// 			item.value = item.value + lastTrackObj[item.millisecond].value
	// 		}
	// 	});

	// 	// 增加lastPropertyTrack提供的额外帧
	// 	diffTrackMs.map(item => {
	// 		newPropertyTrack.push(lastTrackMs[item]);
	// 	});

	// 	// 重排序
	// 	newPropertyTrack.sort((last, next) => {
	// 		return last.millisecond - next.millisecond;
	// 	});
	// 	return newPropertyTrack;
	// }

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
				this.converter = this._toConvert(props);
			}

			this.rekapi.removeActor(this.actor);

			const nextTimeline = (() => {
				const actor = new Actor();
				actor.importTimeline(this._addTimeline(this.converter));
				this.pathTimeline && actor.importTimeline(this.pathTimeline);
				return actor.exportTimeline();
			})();

			const lastTimeline = this.actor.exportTimeline();
			const timelines = this._combineTimeline(lastTimeline, nextTimeline);
			this.actor.removeAllKeyframes();
			console.log(timelines)
			this.actor.importTimeline(timelines.lastTimeline);
			this.actor.importTimeline(timelines.nextTimeline);

			this.rekapi.addActor(this.actor);
		} else {
			const rekanva = new Rekanva(Object.assign({}, options, { target, duration, easing }));
			this.queue[this.queue.length - 1].push(rekanva.rekapi);
		}
		return this;
	}

	to(options) {
		const { target = this.target, duration = this.duration, easing = this.easing, ...props } = options;
		const rekanva = new Rekanva(Object.assign({}, options, { target, duration, easing }));
		this.queue.push([ rekanva.rekapi ]);
		return this;

	}
}

export function Path(path) {
	const pathElement = document.createElementNS('http://www.w3.org/2000/svg',"path"); 
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