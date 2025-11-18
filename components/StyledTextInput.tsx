import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';

const StyledTextInput: React.FC<TextInputProps> = (props) => {
  return (
    <TextInput
      style={styles.input}
      placeholderTextColor="#a9a9a9"
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#2c2c2e',
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 20,
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
});

export default StyledTextInput;
