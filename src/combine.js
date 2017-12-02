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
import { Actor } from 'rekapi';
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
	
	const lastRekanva = this.queue[this.queue.length - 1][0];
	if (target === lastRekanva.target) {

		// 增加自身的事件
		lastRekanva._isFunction(onStop) && lastRekanva.onStop.push(onStop);
		lastRekanva._isFunction(onPlay) && lastRekanva.onPlay.push(onPlay);
		lastRekanva._isFunction(onPause) && lastRekanva.onPause.push(onPause);
		lastRekanva._isFunction(onEnd) && lastRekanva.onEnd.push(onEnd);
		lastRekanva._isFunction(onReset) && lastRekanva.onReset.unshift(onReset);

		lastRekanva.id = lastRekanva._getHash();
		lastRekanva.duration = duration;
		lastRekanva.easing = easing;

		const { path, timeline, ...base } = props;
		lastRekanva.converter = Object.assign({}, lastRekanva.converter, lastRekanva._toConvert(base));
		if (path) {
			lastRekanva.pathTimeline = path(lastRekanva.duration, lastRekanva.attrs.x, lastRekanva.attrs.y);
		} else {
			lastRekanva.pathTimeline = null;
		}
		if (timeline) {
			lastRekanva.specialTimeline = lastRekanva._addSpecialTimeline(timeline);
		} else {
			lastRekanva.specialTimeline = null;
		}

		lastRekanva.rekapi.removeActor(lastRekanva.actor);

		const nextTimeline = (() => {
			const actor = new Actor();
			actor.importTimeline(lastRekanva._addTimeline(lastRekanva.converter));

			lastRekanva.pathTimeline && actor.importTimeline(lastRekanva.pathTimeline);
			lastRekanva.specialTimeline && actor.importTimeline(lastRekanva.specialTimeline);

			return actor.exportTimeline();
		})();

		const lastTimeline = lastRekanva.actor.exportTimeline();
		const timelines = lastRekanva._combineTimeline(lastTimeline, nextTimeline);
		lastRekanva.actor.removeAllKeyframes();
		lastRekanva.actor.importTimeline(timelines.lastTimeline);
		lastRekanva.actor.importTimeline(timelines.nextTimeline);
		

		lastRekanva.rekapi.addActor(lastRekanva.actor);

	} else {
		const rekanva = new this.constructor(Object.assign({}, options, { target, duration, easing }));
		this.queue[this.queue.length - 1].push(rekanva);
	}
	
	return this;
}