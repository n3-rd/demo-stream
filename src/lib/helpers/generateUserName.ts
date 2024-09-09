import { uid } from 'uid';

export const generateUserName = (name: string) => {
	const id = uid(8);
	return name.slice(0, 5) + id;
};
