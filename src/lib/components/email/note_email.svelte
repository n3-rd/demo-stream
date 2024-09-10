<script lang="ts">
    import { Button, Hr, Html, Text, Heading, Container } from 'svelte-email';

    export let title: string;
    export let requirements: string;
    export let steps: string;
    export let keep: string;
</script>

<Html lang="en">
    <Container>
        <Heading as="h2">{title}</Heading>
        <Hr />
        <Text>
            <strong>Requirements:</strong>
            <br />
            {requirements}
        </Text>
        <Hr />
        <Text>
            <strong>Steps on how to:</strong>
            <br />
            {steps}
        </Text>
        <Hr />
        <Text>
            <strong>Keep:</strong>
            <br />
            {keep}
        </Text>
    </Container>
</Html>