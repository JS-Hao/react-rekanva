# react-rekanva.js

react-rekanva.js是一款react-konva的动画插件，它基于rekapi动画库，提供了一系列方法为你更好地组织canvas动画，可制定更为复杂的动画，甚至是实现多个动画的组合。

## 快速开始

```javascript
import { Rekanva } from './react-rekanva';
var rekanva = new Rekanva({
  target: konvaNode,
  translateX: 200,
  duration: 2000,
  easing: 'easeOutExpo'
});

rekanva.play(); //执行动画
```



## 方法

#### **combine**

多个动画可通过```combine```方法合并，```target```默认为上一个动画目标，你也可设置为其他目标，若设置为其他目标，当调用```rekanva.play()```后，则变成两个动画同时播放（因为两个动画并不是作用于同一目标）

```javascript
var rekanva = new Rekanva({
  target: konvaNode,
  translateX: 200,
  duration: 2000,
  easing: 'easeOutExpo'
})
.combine({
  translateY: 100,
  duration: 1000
});
```

#### **to**

倘若你想在某个动画执行完毕时触发下一个动画，可使用```to```方法（```to```方法可多次链式调用）

```javascript
var rekanva = new Rekanva({
  target: konvaNode,
  translateX: 200,
  duration: 2000,
  easing: 'easeOutExpo'
})
.to({
  translateY: 100,
  duration: 1000
})
.to({
  scale: 1.2,
  duration: 3000
});
```

值得注意的事，无论是```combine```还是```to```，当你未传入```target```时，我们将默认```target```为初始实例化时所设置的target目标。

#### **timeline**

react-rekanva提供了一个与css animation很类似的写法: ```timeline```，通过```timeline```我们可以定义目标在不同的进度触发不同的动画

```javascript
var rekanva = new Rekanva({
  target: konvaNode,
  timeline: {
    '0%': {
      translateY: 0,
      opacity: 0,
      easing: 'easeIn'
    },
    '50%': {
      translateY: -100,
      opacity: 1,
      easing: 'easeOut'
    },
    '70%': {
      translateY: 200,
      opacity: 0,
      easing: 'easeIn'
    },
    '100%': {
      translateY: -200,
      opacity: 1,
      easing: 'easeOut'
    }
  },
  duration: 1000,
})
```

#### **udpate**

```update```方法可更新你的动画属性
```javascript
  var rekanva = new Rekanva({
  target: konvaNode,
  translateX: 200,
  duration: 2000,
  easing: 'easeOutExpo',
  onPlay: function() {
    this.update({ translateX: 300 }) // 实际上动画执行后会向x正方向移动300px
  }
})
```

#### **add & delete**

rekanva之所以能够执行一系列的动画（如上述通过```combine```，```to```方法所串联的动画），是因为rekanva内部存在着动画队列```queue```（实际上可以理解成一个按顺序存放着所有动画实例的数组，每个动画实例依次播放），为了更灵活的管理这个队列，可以通过```add```和```delete```方法增添或删除指定的动画

```javascript
// add 用法：
oldRekanva.add(index, newRekanva)  // index为要插入的下标， newRekanva为新的实例
oldRekanva.add(newRekanva)         // 默认在队列末尾增加新的实例

/* delete用法 */
oldRekanva.delete(index)           // index为删除实例的下标, 不传着默认删除队列中最后一个实例

```



## **自定义路径动画**

```Path```方法可帮助你实现更为复杂的路径动画

```javascript
import { Rekanva, Path } from './react-rekanva';

var path = Path('M0,0 C8,33.90861 25.90861,16 48,16 C70.09139,16 88,33.90861 88,56 C88,78.09139 105.90861,92 128,92 C150.09139,92 160,72 160,56 C160,40 148,24 128,24 C108,24 96,40 96,56 C96,72 105.90861,92 128,92 C154,93 168,78 168,56 C168,33.90861 185.90861,16 208,16 C230.09139,16 248,33.90861 248,56 C248,78.09139 230.09139,96 208,96 L48,96 C25.90861,96 8,78.09139 8,56 Z');
var rekanva = new Rekanva({
  target: target,
  path: path,
  duration: 3000
});
```


## 事件

react-rekanva支持```onPlay```, ```onPause```, ```onStop```以及```onEnd```事件，你只需要将这些事件函数传入动画配置即可：

```javascript
var rekanva = new Rekanva({
  target: konvaNode,
  translateX: 200,
  duration: 2000,
  easing: 'easeOutExpo',
  onPlay: function() {
    console.log('the animation is playing!');
  }
  onEnd: function() {
    console.log('the animation is end!');
  }
});
```

除此之外，react-rekanva还允许你手动触发以下事件：

* ```play```          动画开始执行；
* ```reset```          重置动画（通过```to```, ```combine```方法添加的动画也将全部重置）;
* ```stop```          暂停动画（通过```to```, ```combine```方法添加的动画也将全部停止）;
* ```end```           结束所有的动画（通过```to```, ```combine```方法添加的动画也将全部结束）;            
