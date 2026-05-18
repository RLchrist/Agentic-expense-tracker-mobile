import React from 'react';
import { View, Text, TextInput } from 'react-native';

interface OutlinedInputProps extends React.ComponentPropsWithoutRef<typeof TextInput> {
  label: string;
  error?: string;
  icon?: any;
  rightElement?: React.ReactNode;
  InputComponent?: React.ElementType;
}

const OutlinedInput = ({ 
  label, 
  error, 
  icon: Icon,
  rightElement,
  InputComponent = TextInput,
  ...props 
}: OutlinedInputProps) => {
  
  return (
    <View className="mb-5">
      <View className="relative">
        <View 
          className={`border rounded-xl px-4 flex-row ${
            props.editable === false 
              ? 'bg-card dark:bg-card/50 border-border dark:border-slate-800' 
              : 'bg-background dark:bg-slate-900 ' + (error ? 'border-rose-500' : 'border-border dark:border-slate-700')
          } ${props.multiline ? 'min-h-[120px] items-start py-3' : 'h-14 items-center'}`}
        >
          {Icon && <Icon size={20} className="text-muted-foreground dark:text-muted-foreground mr-3" />}
          <InputComponent
            {...props}
            className={`flex-1 text-base font-medium ${
              props.editable === false ? 'text-muted-foreground dark:text-muted-foreground' : 'text-foreground dark:text-slate-100'
            }`}
            style={[
              props.style,
              props.multiline ? { minHeight: 100, alignSelf: 'stretch', textAlignVertical: 'top' } : { height: '100%' }
            ]}
            placeholderTextColor="#94a3b8"
            textAlignVertical={props.multiline ? 'top' : 'center'}
          />
          {rightElement}
        </View>
        <View 
          className={`absolute -top-2.5 left-3 px-1.5 ${
            props.editable === false ? 'bg-card dark:bg-card/50' : 'bg-background dark:bg-slate-900'
          }`}
          pointerEvents="none"
        >
          <Text className={`text-[11px] font-bold uppercase tracking-wider ${
            error ? 'text-rose-500' : 'text-muted-foreground'
          }`}>
            {label.replace('*', '')}
            {label.includes('*') && <Text className="text-rose-500">*</Text>}
          </Text>
        </View>
      </View>
      {error && <Text className="text-rose-500 text-[11px] mt-1 ml-1">{error}</Text>}
    </View>
  );
};

export default OutlinedInput;
