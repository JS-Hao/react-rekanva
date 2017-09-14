import { Rekapi, Actor } from 'rekapi';

function endedState(target, type, value) {
	const init = []
	const end = [];
	
	switch (type) {
		case 'translateX':
			const x = target.attrs.x;
			init.push(() => { target.attrs.x = x });
			end.push(() => { target.attrs.x = x + value });
			break;

		case 'translateY':
			const y = target.attrs.y;
			init.push(() => { target.attrs.y = y });
			end.push(() => { target.attrs.y = y + value });
			break;

		default:
			break;
	}

	return { init, end }
}

function converter(animiOpt) {
	const conver = {};
	animiOpt.forEach((item, key) => {
		switch (key) {
			case 'translateX':
				conver['x'] = item;
		}
	})
}

export class Rekanva {
	constructor(options) {
		const { target, easing = 'linear', duration = 1000, ...props } = options;
		this.target = target;
		this.easing = easing;
		this.duration = duration;
		this.animOpt = props;
		this.rekapi = new Rekapi(document.createElement('canvas').getContext('2d');

		const keys = Object.keys(this.animOpt);
		// const actorRenders = keys.map((key, item) => {
		// 	return converter(target, key, item);
		// });

		const actor = new Actor({
			key.reduce((preValue, curValue) => {
				endedState(target, curValue, this.animOpt[curValue]);
			});
		});

		this.rekapi.keyframe(0, converter())

	}

	play() {

	}

	stop() {

	}
}



export const Rekanva = function(options) {
	const { target, easing = 'linear', duration = 1000, ...props } = options;
	const keys = Object.keys(props);
	const rekanva = {};

	const rekapi = new Rekapi(document.createElement('canvas').getContext('2d'););

	const x = target.attrs.x;
	const actor = new Actor({
		render: (context, state) => {
			target.attrs.x = x + state.x;
		}
	});
	rekapi.keyframe(0, {
			x: 0
		})
		.keyframe(duration, {
			x: 250
		});	

		rekanva.play = play;
		rekanva.stop = stop;

}

function play() {

}

function stop() {

}

var cssSelector = Rekanva({
  target: konvaNode,
  translateX: 250
});