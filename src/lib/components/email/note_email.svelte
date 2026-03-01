<script lang="ts">
    import { Button, Hr, Html, Text, Heading, Container } from 'svelte-email';

    interface Props {
        title: string;
        requirements: string;
        steps: string;
        keep: string;
    }

    let {
        title,
        requirements,
        steps,
        keep
    }: Props = $props();
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