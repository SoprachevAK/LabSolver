<template>
	<div class="parent abs-full" ref="parent">
		<svg class="svg" ref="svg" :width="width" :height="height">
			<g class="axis-x" v-if="axesShow"></g>
			<g class="axis-y" v-if="axesShow"></g>
			<g class="points" stroke="black"></g>
			<g class="lines"></g>
			<g class="lines-2"></g>
			<!-- <line
				x1="10"
				y1="10"
				x2="250"
				y2="50"
				stroke="#000"
				stroke-width="2"
				marker-end="url(#head)"
			/> -->
		</svg>
		<div class="settings">
			<h1>Настройки</h1>
			<p>Введите два вектора с ненулевыми компонентами</p>
			<br />
			<div class="flex">
				<p>V1.n1:</p>
				<input class="flex-1" type="number" v-model="vector[0].x" />
			</div>
			<div class="flex">
				<p>V1.n2:</p>
				<input class="flex-1" type="number" v-model="vector[0].y" />
			</div>
			<br />
			<div class="flex">
				<p>V2.n1:</p>
				<input class="flex-1" type="number" v-model="vector[1].x" />
			</div>
			<div class="flex">
				<p>V2.n2:</p>
				<input class="flex-1" type="number" v-model="vector[1].y" />
			</div>
			<hr />
			<div class="flex">
				<p>Размер:</p>
				<input class="flex-1" type="range" v-model="size" min="5" max="20" />
			</div>
			<div class="flex">
				<p>Оптимизация:</p>
				<input class="flex-1" type="number" v-model="opt" />
			</div>
			<div class="flex">
				<p>Оси:</p>
				<input type="checkbox" v-model="axesShow" />
			</div>
			<hr />
			<p>Базовый узор тыкать прямо по точкам на графике</p>
			<hr />
			<button @click="clear" v-if="pattern.length">Очистить</button>
			<button @click="save" v-if="pattern.length">Сохранить svg</button>
			<hr />
			<div class="list" v-if="solution">
				<h2>Решения</h2>
				<p>Определитель: {{ solution.det }}</p>
				<br />
				<p>Альтернативные возможные вектора, тыкать пока не найдётся успешный:</p>
				<div
					v-for="solution in solution.sol"
					:key="solution.x * 1046527 + solution.y"
					class="card"
					@click="select(solution)"
					:class="
						selected && solution.x == selected.x && solution.y == selected.y ? 'selected' : ''
					"
				>
					({{ solution.x }}, {{ solution.y }})
				</div>
			</div>
		</div>
	</div>
	<resize-observer @notify="handleResize" />
</template>

<script>
import { select, selectAll, Selection } from 'd3-selection';
import { zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import { axisBottom, axisLeft } from 'd3-axis';
import { scaleLinear, scaleTime } from 'd3-scale';

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function saveSvg(svgEl, name) {
	svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	var svgData = svgEl.outerHTML;
	var preface = '<?xml version="1.0" standalone="no"?>\r\n';
	var svgBlob = new Blob([preface, svgData], { type: 'image/svg+xml;charset=utf-8' });
	var svgUrl = URL.createObjectURL(svgBlob);
	var downloadLink = document.createElement('a');
	downloadLink.href = svgUrl;
	downloadLink.download = name;
	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
}

export default {
	data() {
		return {
			width: 100,
			height: 100,
			pattern: [],
			vector: [
				{ x: 6, y: 3 },
				{ x: 4, y: -2 },
			],
			selected: null,
			size: 10,
			opt: 10,
			axesShow: true,
		};
	},
	methods: {
		select(t) {
			this.selected = t;
			this.draw();
		},
		save() {
			saveSvg(this.$refs.svg, 'chart');
		},
		mouseClick(d, i) {
			console.log(i);
			if (this.pattern.some((t) => t.x == i.x && t.y == i.y)) {
				this.pattern = this.pattern.filter((t) => !(t.x == i.x && t.y == i.y));
			} else {
				this.pattern.push(i);
			}
			this.draw();
		},
		clear() {
			this.pattern = [];
			this.draw();
		},
		draw() {
			let x = Number(this.size * 2);
			let y = Number(this.size * 2);

			let points = new Array(x + 1).fill(new Array(y + 1).fill(0)).map((t, i) =>
				t.map((t2, i2) => ({
					x: i,
					y: i2,
					color: this.pointColor(i, i2),
				}))
			);

			select('.points')
				.selectAll('circle')
				.data(points.flatMap((t) => t))
				.join('circle')
				.attr('r', 5)
				.attr('cy', (d, i) => this.height - (d.y * this.height) / x)
				.attr('cx', (d, i) => (d.x * this.width) / x)
				.attr('fill', (d, i) => d.color)
				.on('click', this.mouseClick);

			select('.axis-x')
				.attr('transform', `translate(0, ${this.height / 2})`)
				.call(
					axisBottom(
						scaleLinear()
							.domain([-x / 2, x / 2])
							.range([0, this.width])
					).ticks(0, 'f')
				);

			select('.axis-y')
				.attr('transform', `translate(${this.width / 2},0)`)
				.call(
					axisLeft(
						scaleLinear()
							.domain([y / 2, -y / 2])
							.range([0, this.height])
					).ticks(0, 'f')
				);

			if (this.pattern.length > 0) {
				let point = this.pattern[this.pattern.length - 1];

				let points = [
					[this.vector[0], this.vector[1]],
					[this.vector[1], this.vector[0]],
				];

				if (this.selected) {
					points = [
						[this.vector[0], this.vector[1]],
						[this.vector[1], this.vector[0]],
						[this.vector[0], this.selected],
						[this.selected, this.vector[0]],
					];
				}
				console.log(points);
				select('.lines')
					.selectAll('line')
					.data(points)
					.join('line')
					.attr('x1', (point.x * this.width) / x)
					.attr('y1', this.height - (point.y * this.height) / x)
					.attr('x2', (t) => ((point.x + t[0].x) * this.width) / x)
					.attr('y2', (t) => this.height - ((point.y + t[0].y) * this.height) / x)
					.attr('stroke', (t) => (t[0] == this.selected ? 'green' : 'black'));

				select('.lines-2')
					.selectAll('line')
					.data(points)
					.join('line')
					.attr('x1', (t) => ((point.x + t[0].x) * this.width) / x)
					.attr('y1', (t) => this.height - ((point.y + t[0].y) * this.height) / x)
					.attr('x2', (t) => ((point.x + t[0].x + t[1].x) * this.width) / x)
					.attr('y2', (t) => this.height - ((point.y + t[0].y + t[1].y) * this.height) / x)
					.attr('stroke-dasharray', 5)
					.attr('stroke', (t) => (t[1] == this.selected ? 'green' : 'black'));
			} else {
				select('.lines').selectAll('line').remove();
				select('.lines-2').selectAll('line').remove();
			}
		},
		handleResize() {
			let parent = this.$refs.parent;
			let min = Math.min(parent.clientWidth - 220, parent.clientHeight);
			this.width = min;
			this.height = min;
			this.draw();
		},
		pointColor(x, y) {
			if (this.pattern.some((t) => t.x == x && t.y == y)) {
				return 'orange';
			}

			let v = this.vector[0];
			let v2 = this.vector[1];

			for (let i = 0; i < this.pattern.length; i++) {
				let p = this.pattern[i];
				p = { x: x - p.x, y: y - p.y };

				for (let o = -Math.ceil(this.opt); o < Math.ceil(this.opt); o++) {
					let point = { x: p.x - v2.x * o, y: p.y - v2.y * o };
					if (point.x % v.x == 0 && point.y % v.y == 0 && point.x / v.x == point.y / v.y)
						return 'black';
				}
			}

			return 'white';
		},
	},
	mounted() {
		this.handleResize();
		this.draw();
	},
	watch: {
		size() {
			this.draw();
		},
		opt() {
			this.draw();
		},
		async axesShow() {
			await sleep(1);
			this.draw();
		},
		vector: {
			handler: function (t) {
				this.draw();
			},
			deep: true,
		},
	},
	computed: {
		solution() {
			let det = this.vector[0].x * this.vector[1].y - this.vector[0].y * this.vector[1].x;
			let y = (x) => (Math.abs(det) + this.vector[0].y * x) / this.vector[0].x;
			return {
				det,
				sol: Array(40)
					.fill(0)
					.map((i, x) => ({ x: x - 20, y: y(x - 20) }))
					.filter((t) => t.y % 1 == 0 && t.x != 0 && t.y != 0),
				// .filter((t) => this.pointColor(t.x, t.y) != 'white'),
			};
		},
	},
};
</script>

<style lang="scss" scoped>
@import '@/styles/card.scss';

.parent {
	overflow: hidden;
	.settings {
		overflow: scroll;
		width: 200px;
		height: 100%;
		position: absolute;
		padding: 10px;
		right: 0;
		top: 0;
		border-left: 2px solid silver;

		h1 {
			text-align: center;
		}
	}
}
.card {
	margin: 5px 0;
	cursor: pointer;
}
input {
	min-width: 0;
}

svg {
	// height: 200px;
	overflow: auto;
	stroke: black;
	.points {
		cursor: pointer;
	}

	.lines,
	.lines-2 {
		stroke-width: 2;
	}
}
</style>
