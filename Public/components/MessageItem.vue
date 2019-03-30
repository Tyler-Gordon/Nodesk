<template>
    <div>
        <p>
            {{message.message}}
        </p>    
    </div>    
</template>
<script>
export default {
    name:'MessageItem',
    props:['message']
}
</script>
<style scoped>

</style>
