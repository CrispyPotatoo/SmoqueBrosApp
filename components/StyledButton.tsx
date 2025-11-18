import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps } from 'react-native';

interface StyledButtonProps extends TouchableOpacityProps {
  title: string;
}

const StyledButton: React.FC<StyledButtonProps> = ({ title, ...props }) => {
  return (
    <TouchableOpacity style={styles.button} {...props}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#f96d00',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default StyledButton;
