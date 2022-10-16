import { AsyncStorage } from 'react-native';

export default {

    setUser: async user => await AsyncStorage.setItem(
        'user', JSON.stringify(user)
    ),

    getUser: async () => JSON.parse(await AsyncStorage.getItem('user')),


    auth: async () => await AsyncStorage.getItem('user') != null,


    getToken: async () => {
        let user = JSON.parse(await AsyncStorage.getItem('user'));
        return user !== null ? user.token : '';
    },


    updateProfile: async profile => {
        let user = JSON.parse(await AsyncStorage.getItem('user'));
        profile.token = user.token;
        await AsyncStorage.setItem('user', JSON.stringify(profile));
    },


    logout: async () => await AsyncStorage.removeItem('user')

}