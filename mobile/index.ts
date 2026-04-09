import './global.css';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import { registerRootComponent } from 'expo';
import App from './src/App';

WebBrowser.maybeCompleteAuthSession();

registerRootComponent(App);
