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
export default function combine(options) {
	const {
		target = this.target,
		duration = this.duration,
		easing = this.easing,

		onPlay,
		onStop,
		onEnd,
		onReset,
		onPause,

		...props } = options;
	

	if (target === this.target) {

		// 增加自身的事件
		this._isFunction(onStop) && this.onStop.push(onStop);
		this._isFunction(onPlay) && this.onPlay.push(onPlay);
		this._isFunction(onPause) && this.onPause.push(onPause);
		this._isFunction(onEnd) && this.onEnd.push(onEnd);
		this._isFunction(onReset) && this.onReset.onReset(onReset);

		this.id = this._getHash();
		this.duration = duration;
		this.easing = easing;

		const { path, timeline, ...base } = props;
		this.converter = this._toConvert(base);
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

		this.rekapi.removeActor(this.actor);

		const nextTimeline = (() => {
			const actor = new Actor();
			actor.importTimeline(this._addTimeline(this.converter));

			this.pathTimeline && actor.importTimeline(this.pathTimeline);
			this.specialTimeline && actor.importTimeline(this.specialTimeline);

			return actor.exportTimeline();
		})();

		const lastTimeline = this.actor.exportTimeline();
		const timelines = this._combineTimeline(lastTimeline, nextTimeline);
		this.actor.removeAllKeyframes();
		this.actor.importTimeline(timelines.lastTimeline);
		this.actor.importTimeline(timelines.nextTimeline);
		

		this.rekapi.addActor(this.actor);

	} else {
		const rekanva = new this.constructor(Object.assign({}, options, { target, duration, easing }));
		this.queue[this.queue.length - 1].push(rekanva);
	}
	return this;
}