import React from 'react';
import io from "socket.io-client";
import { Auth, Urls, Strings, Moment } from "../config";

const ChatContext = React.createContext();

export class ChatProvider extends React.Component {

    connect = async () => {
        let token = await Auth.getToken();
        let socket = io(Urls.SOCKET, { query: 'token=' + token });
        socket.on('connect', () => this.setState({ connected: true }));
        socket.on('disconnect', () => this.setState({ connected: true }));
        socket.on('data', this.onData);
        socket.on('message', this.onNewMessage);
        socket.on('user_status', this.updateUsersState);
        socket.on('typing', this.onTypingMessage);
        socket.on('new_user', this.onNewUser);
        socket.on('update_user', this.onUpdateUser);
        this.setState({ socket });
        return socket;
    }

    loadUserAccount = async () => {
        let account = await Auth.getUser();
        this.setState({ account });
    }

    setCurrentContact = contact => {
        this.setState({ contact });
        if (!contact || !contact.id) return;
        this.state.socket.emit('seen', contact.id);
        let messages = this.state.messages;
        messages.forEach((element, index) => {
            if (element.sender === contact.id) messages[index].seen = true;
        });
        this.setState({ messages });
    };

    sendMessage = content => {
        if (!this.state.contact.id) return;
        let message = {
            content: content,
            sender: this.state.account.id,
            receiver: this.state.contact.id,
            date: new Date().getTime()
        }
        message = this.formatMessage(message);
        let messages = this.state.messages.concat(message);
        this.setState({ messages });
        this.state.socket.emit('message', message);
    }

    sendType = () => this.state.socket.emit('typing', this.state.contact.id);

    status = () => {
        let status = this.state.contact.status;
        if (this.state.typing) return Strings.WRITING_NOW;
        if (status === true) return Strings.ONLINE;
        if (status) return Moment(status).fromNow();
    }

    logout = () => {
        this.state.socket.disconnect();
        this.setState({ contacts: [], messages: [], contact: {} });
    }


    state = {
        connected: false,
        connect: this.connect,
        loadUserAccount: this.loadUserAccount,
        setCurrentContact: this.setCurrentContact,
        sendMessage: this.sendMessage,
        sendType: this.sendType,
        status: this.status,
        logout: this.logout,
        socket: null,
        account: null,
        typing: false,
        contact: {},
        contacts: [],
        messages: []
    }

    render() {
        return (
            <ChatContext.Provider value={this.state}>
                {this.props.children}
            </ChatContext.Provider>
        );
    }

    onData = (user, contacts, messages, users) => {
        messages = messages.map(this.formatMessage);
        this.setState({ messages, contacts, user }, () => {
            this.updateUsersState(users);
        });
    };

    onNewMessage = message => {
        if (message.sender === this.state.contact.id) {
            this.setState({ typing: false });
            this.state.socket.emit('seen', this.state.contact.id);
            message.seen = true;
        }
        let messages = this.state.messages.concat(this.formatMessage(message));
        this.setState({ messages });
    }

    onTypingMessage = sender => {
        if (this.state.contact.id != sender) return;
        this.setState({ typing: sender });
        clearTimeout(this.state.timeout);
        const timeout = setTimeout(this.typingTimeout, 3000);
        this.setState({ timeout });
    }

    typingTimeout = () => this.setState({ typing: false });


    updateUsersState = users => {
        let contacts = this.state.contacts;
        contacts.forEach((element, index) => {
            if (users[element.id]) contacts[index].status = users[element.id];
        });
        this.setState({ contacts });
        let contact = this.state.contact;
        if (users[contact.id]) contact.status = users[contact.id];
        this.setState({ contact });
    };


    onNewUser = user => {
        let contacts = this.state.contacts.concat(user);
        this.setState({ contacts });
    }

    onUpdateUser = async user => {
        if (this.state.account.id === user.id) {
            this.setState({ account: user });
            await Auth.updateProfile(user);
            return;
        }
        let contacts = this.state.contacts;
        contacts.forEach((element, index) => {
            if (element.id === user.id) {
                contacts[index] = user;
                contacts[index].status = element.status;
            }
        });
        this.setState({ contacts });
        if (this.state.contact.id === user.id) this.setState({ contact: user });
    }

    formatMessage = message => {
        message._id = message._id || message.date;
        message.text = message.content;
        message.createdAt = message.date;
        message.user = { _id: message.sender };
        return message;
    }

}

export function withChatContext(Component) {
    class ComponentWithChat extends React.Component {
        render() {
            return (
                <ChatContext.Consumer>
                    {chat => <Component {...this.props} chat={chat} />}
                </ChatContext.Consumer>
            );
        }
    }
    return ComponentWithChat;
}