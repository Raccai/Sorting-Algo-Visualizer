<script>
	import { flip } from 'svelte/animate';
	import { sineInOut } from 'svelte/easing';
  	import { onMount } from 'svelte';

	let shuffledArray = [];
	let isDone = false;
	let isDisabled = false;
	let _i, _j;
	let selectedAlgo, selectedSpeed, selectedSize;
	let compares = 0;
	let swaps = 0;
	let algos = [
		{id: 1, algo: "Bubble Sort"}, {id: 2, algo: "Insertion Sort"},
		{id: 3, algo: "Quick Sort"}, {id: 4, algo: "Selection Sort"}
	]
	let speeds = [
		{id: 1, speed: "1.00x"}, {id: 0.4, speed: "3.00x"},
		{id: 0.2, speed: "5.00x"}, {id: 0.1, speed: "10.00x"},
	]
	let sizes = [
		{id: 5, size: "5"}, {id: 10, size: "10"},
		{id: 30, size: "30"}, {id: 50, size: "50"},
		{id: 100, size: "100"}, {id: 150, size: "150"},
	]

	let styles = {
		height: 500,
		width: 1000,
		width2: shuffledArray.length,
	}

	// IS CALLED TO GET A NEW ARRAY
	function getShuffledArray() {
		shuffledArray = []
		for (let i=0; i<selectedSize.id; i++) {
			shuffledArray[i] = Math.random() * (styles.height - 20 + 1) + 10;
		}
	}

	// SETS HEIGHT AND WIDTH SCRIPT VARIABLES TO CSS VARS TO BE USED IN STYLES
	$: cssVarStyles = Object.entries(styles)
		.map(([key, value]) => `--${key}:${value}`)
		.join(';');

	// SELECTION SORT
	async function selection() {
		let n = shuffledArray.length;
		for (let step=0; step<n-1; step++){
			let minVal = step;
			for(let i=step+1; i<n; i++){
				if(compare(shuffledArray[minVal], shuffledArray[i], 1)){
					minVal = i;
					await sleep(1000);
				}
			}
			swap(step, minVal, 1);
			await sleep(1000);
		}
		done();
	}

	// QUICK SORT
	async function quick() {
		async function split(start, end) {
			if (start === end) return;

			let pivot = shuffledArray[end];
			let i = start - 1;
			for (let j = start; j < end; j++) {
				if (compare(pivot, shuffledArray[j], 2)) {
					// await i;
					i++;
					swap(i, j, 2);
					await sleep(1000);
				}
			}
			swap(i+1, end, 2);
			await sleep(1000);
			return i + 1;
		}

		async function sort(start, end) {
			if (start < end) {
				const j = await split(start, end);
				await sort(start, j - 1);
				await sort(j + 1, end);
			}
		}

		await sort(0, shuffledArray.length - 1)
		done();
	}

	// INSERTION SORT
	async function insertion() {
		for (let i=1; i<shuffledArray.length; i++){
			let currenVal = shuffledArray[i];
			let j;
			for (j=i-1; j>=0 && compare(shuffledArray[j], currenVal, 2); j--){
				swap(j+1, j, 2);
				await sleep(1000);
			}
			shuffledArray[j+1] = currenVal;
		}
		done();
	}
	
	// BUBBLE SORT
	async function bubble() {
		for (let i=0; i<shuffledArray.length-1; i++){
			for (let j=i; j<shuffledArray.length; j++){
				if (compare(shuffledArray[i], shuffledArray[j], 2)){
					swap(i, j, 2);
					await sleep(1500);
				}
			}
		}
		done();
	}

	//HELPER FUNCTIONS
	function mark(i, j) {
		_i = shuffledArray.indexOf(i);
		_j = shuffledArray.indexOf(j);
	}

	function mark2(i, j){
		_i = i;
		_j = j;
	}
	
	function swap(i, j, markVal) {
		if (markVal === 1) mark(i, j);
		else mark2(i, j)
		const temp = shuffledArray[i];
		shuffledArray[i] = shuffledArray[j];
		shuffledArray[j] = temp;
		swaps++;
	}

	function compare(i, j, markVal) {
		if (markVal === 1) mark(i, j);
		else mark2(i, j)
		compares++;
		if (i > j){
			return true
		} 
		return false
	}
	
	//ALGORITHM CALL TO SORT
	const sort = () => {
		compares = 0;
		swaps = 0;
		isDisabled = true;
		if (selectedAlgo.id === 1) bubble();
		if (selectedAlgo.id === 2) insertion();
		if (selectedAlgo.id === 3) quick();
		if (selectedAlgo.id === 4) selection();		
	}

	// IS CALLED WHEN AN ALGO FINISHES
	const done = () => {
		isDisabled = false;
		isDone = true;
	}

	// USED TO PAUSE AND SHOW ANIMATIONS
	const sleep = (time) => {
		return new Promise((resolve) => setTimeout(resolve, selectedSpeed.id * time));
	};

	// CALLED WHEN FIRST RUN
	onMount(async () => {
		getShuffledArray();
	});
</script>

<main>
	<div class="container">
		<div class="inputs">
			<select bind:value={selectedAlgo} disabled={isDisabled}>
				{#each algos as algo}
					<option value={algo}>
						{algo.algo}
					</option>
				{/each}
			</select>
			<select bind:value={selectedSize} on:change={getShuffledArray} disabled={isDisabled}>
				{#each sizes as size}
					<option value={size}>
						{size.size}
					</option>
				{/each}
			</select>
			<select bind:value={selectedSpeed}>
				{#each speeds as speed}
					<option value={speed}>
						{speed.speed}
					</option>
				{/each}
			</select>
			<button on:click={sort} disabled={isDisabled}>Sort</button>
			<button on:click={getShuffledArray} disabled={isDisabled}>New Array</button>
			<div class="data">
				<p>Compares: {compares}</p>
				<p>Swaps: {swaps}</p>
			</div>
		</div>
		<div class="display" style={cssVarStyles}> 
			{#each shuffledArray as item, index (item)}
				<div id="bars" style=" background: {index === _i || index === _j ? '#FE6172' : '#92a1d6'};
										height: {item}px; width: {styles.width}px;"
										animate:flip={{duration:100, easing:sineInOut}} 
				/>
			{/each}
		</div>
	</div>
</main>

<style>
	.container {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		margin: 60px 0 0 0;
		padding: 20px 0;
		background-color: #24293B;
	}

	.data {
		display: flex;
		gap: 20px;
		justify-content: center;
		margin: 10px 0 20px 0;
	}

	.data p {
		color: #cbd5f8;
	}

	.display {
		box-shadow: 1px 3px 6px rgba(0, 0, 0, 0.3);
		background-color: #222638;
		display: flex;
		justify-content: center;
		align-items: flex-end;
		height: calc(var(--height)*1px);
		width: calc(var(--width)*1px);
		border-radius: 5px 5px 0 0;
	}

	:global(body) {
		background: #282D3F;
	}

	p {
		color: white;
	}

	#bars {
		display: inline-block;
		margin: 0 2px;
		margin-bottom: -100;
		border-radius: 5px 5px 0 0;
	}

	button,
	select {
		background-color: #30364C;
		border: none;
		color: #cbd5f8;
	}

	@media only screen and (max-width: 900px) {
		.display {
			height: calc(var(--height)*0.5px);
			width: calc(var(--width)*0.5px);
			box-shadow: none;
			background: none;
		}

		.data {
			margin-bottom: 260px;
		}

		.container {
			margin: 0;
			height: 100vh;
		}
	}

	@media only screen and (max-width: 500px) {
		.display {
			height: calc(var(--height)*0.2px);
			width: calc(var(--width)*0.2px);
			box-shadow: none;
			background: none;
			margin-bottom: -100px;
		}

		.data {
			margin-bottom: 400px;
		}

		.container {
			margin: 0;
			height: 100vh;
		}
	}
</style>