export default function deleteFunc(index) {
	if (index) {
		this.queue.splice(index, 1);
	} else {
		this.queue.pop();
	}
}