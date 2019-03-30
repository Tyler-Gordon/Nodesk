<template>
    <div>
        <div v-bind:key="message.user" v-for="message in messages">
            <MessageItem v-bind:message="message"/>
        </div>
    </div>    
</template>
<script>
import MessageItem from './MessageItem.vue'
export default {
    name: 'Messages',
    components:{
        MessageItem
    },
    props: ['messages']
}
</script>
<style scoped>

</style>
