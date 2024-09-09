import { uid } from 'uid';

export const generateMeetingCode = () => {
	const id = uid(8);
	return id;
};
