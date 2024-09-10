<script lang="ts">
	import { Button, Hr, Html, Text, Heading, Container, Link } from 'svelte-email';

	export let name:string;
    export let url:string;
</script>

<Html lang="en">
    <Container>
    <Heading as="h2">Invitation to Demo meeting</Heading>
	<Text>
        Hello {name}, you are invited to our demo meeting.
	</Text>
	<Hr />
	<Button href={url}
    style={{color: 'white',padding: '10px 20px', borderRadius: '20px', backgroundColor: '#577AB7'}}
    >Join meeting</Button>
    <Text>
        If button does not work, click <Link href={url}>here</Link>
    </Text>
</Container>
</Html>