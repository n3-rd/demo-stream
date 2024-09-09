export function copyText(text: string) {
	navigator.clipboard
		.writeText(text)
		.then(() => {
			console.log('Content copied to clipboard');
		})
		.catch((err) => {
			console.error('Failed to copy: ', err);
		});
}
