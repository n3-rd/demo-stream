export function generateUserName(name: string): string {
	// Remove special characters and spaces
	const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
	
	// Add a random number between 1000-9999 to make it unique
	const randomNum = Math.floor(Math.random() * 9000) + 1000;
	
	return `${cleanName}${randomNum}`;
}
