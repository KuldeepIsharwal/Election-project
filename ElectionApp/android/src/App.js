import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

const App = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
      <View>
        <Text style={{ fontSize: 24, color: 'black', fontWeight: 'bold' }}>
          The App is Alive!
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default App;