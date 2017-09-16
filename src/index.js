import { Rekapi, Actor } from 'rekapi';

const _converter = {
	'translateX': 'x',
	'translateY': 'y',
	'scale': ['scaleX', 'scaleY']

}

export class Rekanva {
	constructor(options) {
		const { target, easing = 'linear', duration = 1000, ...props } = options;
		this.target = target;
		this.attrs = target.attrs;
		this.easing = easing;
		this.duration = duration;
		this.animOpt = props;
		this.rekapi = new Rekapi(document.createElement('canvas').getContext('2d'));
		this.converter = this._toConvert(this.animOpt);

		this.actor = new Actor({
			render: (context, state) => {
				this._render(this.target, state);
			}
		});

		this.actor.importTimeline(this._addTimeline(this.converter));
		this.rekapi.addActor(this.actor);
		this.queue = [ this.rekapi ];

	}

	_addTimeline(converter) {
		const actor = new Actor();
		actor
			.keyframe(0, this._getState('start', converter))
			.keyframe(this.duration, this._getState('end', converter));
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

	_getState(moment, converter) {
		let state = {};
		if (moment === 'start') {
			for (let key in converter) {
				this._setAttributes(state, key);
			}
		} else if (moment === 'end') {
			for (let key in converter) {
				this._setAttributes(state, key, converter[key]);
			}
		}
		return state;
	}

	_setAttributes(state, key, converter) {
		switch (key) {
			case 'scaleX':
			case 'scaleY':
				converter ? (state[key] = converter) : (state[key] = this.attrs[key]);
				break;

			default: 
				converter ? (state[key] = converter + this.attrs[key]) : (state[key] = this.attrs[key]);
				break;
		}
	}

	_render(target, state) {
		for (let key in state) {
			target.to({[key]: state[key], duration: -1});
		}
	}

	play() {
		this.queue.map(rekapi => {
			rekapi.play(1);
		})
		// this.rekapi.play(1);
	}

	stop() {

	}

  // 获取两条timeline，当timeline有重复定义的track定义时，将相同的track合并到nextTimeline上，并删除lastTimeline的同名track
	_combineTimeline(lastTimeline, nextTimeline) {
		const lastTrackNames = lastTimeline.trackNames;
		const nextTrackNames = nextTimeline.trackNames;
		const sameTrackNames = [];

		lastTrackNames.map(name => {
			if (nextTrackNames.indexOf(name) !== -1) {
				// 删除lastTimeline的同名track
				lastTimeline.trackNames = lastTimeline.trackNames.filter(item => item !== name);
				sameTrackNames.push(name);
			}
		});

		sameTrackNames.map(name => {
			// 获取lastTime的同名propertyTrack, 并删除它
			const lastPropertyTrack = lastTimeline.propertyTracks[name];
			delete lastTimeline.propertyTracks[name];
			// 获取nextTime的同名propertyTrack, 并与lastPropertyTrack合并
			const nextPropertyTrack = nextTimeline.propertyTracks[name];
			const newPropertyTrack = this._combinePropertyTrack(lastPropertyTrack, nextPropertyTrack, this.attrs[name]);
			nextTimeline.propertyTracks[name] = newPropertyTrack;
		});

		console.log(lastTimeline, nextTimeline)
		return { lastTimeline, nextTimeline }
	}

	_combinePropertyTrack(lastPropertyTrack, nextPropertyTrack, attr) {
		const lastTrackMs = lastPropertyTrack.map(item => item.millisecond);
		const nextTrackMs = nextPropertyTrack.map(item => item.millisecond);
		const sameTrackMs = [], diffTrackMs = [];

		const lastTrackObj = {};
		lastPropertyTrack.map(item => {
			lastTrackObj[item.millisecond] = item;
		});	

		lastTrackMs.map(item => {
			if (nextTrackMs.indexOf(item) !== -1) {
				sameTrackMs.push(item);
			} else {	
				diffTrackMs.push(item);
			}
		});
		const newPropertyTrack = nextPropertyTrack;

		// 合并相同帧的value
		newPropertyTrack.map(item => {
			if (sameTrackMs.indexOf(item.millisecond) !== -1) {
				// 两个track的value叠加，将会多出一个target.attr
				item.value = item.value + lastTrackObj[item.millisecond].value - attr
			}
		});

		// 增加lastPropertyTrack提供的额外帧
		diffTrackMs.map(item => {
			newPropertyTrack.push(lastTrackMs[item]);
		});

		// 重排序
		newPropertyTrack.sort((last, next) => {
			return last.millisecond - next.millisecond;
		});
		return newPropertyTrack;
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
			this.duration = duration;
			this.easing = easing;
			this.converter = this._toConvert(props);
			this.rekapi.removeActor(this.actor);

			const nextTimeline = this._addTimeline(this.converter);
			const lastTimeline = this.actor.exportTimeline();
			console.log(lastTimeline, nextTimeline)
			const timelines = this._combineTimeline(lastTimeline, nextTimeline);

			this.actor.removeAllKeyframes();
			this.actor.importTimeline(timelines.lastTimeline);
			this.actor.importTimeline(timelines.nextTimeline);
			this.rekapi.addActor(this.actor);
		} else {
			const rekanva = new Rekanva(options);
			this.queue.push(rekanva.rekapi);
		}
		return this;
	}

	to(options) {
		const { target = this.target, duration = this.duration, easing = this.easing, ...props } = options;
		
	}
}