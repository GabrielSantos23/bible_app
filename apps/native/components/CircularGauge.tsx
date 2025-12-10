import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

export const CircularGauge = ({ 
  value, 
  max, 
  radius = 60, 
  strokeWidth = 12,
  activeColor = "#22c55e",
  backgroundColor = "#1e293b",
  thumbColor = "#ffffff",
  showCenterText = true,
  centerTextColor = "#ffffff",
  centerTextSize = 36,
  showLabel = true,
  labelText,
}: {
  value: number;
  max: number;
  radius?: number;
  strokeWidth?: number;
  activeColor?: string;
  backgroundColor?: string;
  thumbColor?: string;
  showCenterText?: boolean;
  centerTextColor?: string;
  centerTextSize?: number;
  showLabel?: boolean;
  labelText?: string;
}) => {
  const normalizedRadius = radius - strokeWidth / 2;
  
  const visibleDegrees = 330; 
  const totalCircumference = normalizedRadius * 2 * Math.PI;
  const visibleCircumference = (visibleDegrees / 360) * totalCircumference;

  const rotationOffset = 90 + (360 - visibleDegrees) / 2;

  const progressRatio = value / max;
  const strokeDashoffset = visibleCircumference - (progressRatio * visibleCircumference);

  const dotRotation = progressRatio * visibleDegrees;
  
  const isFull = value >= max;

  return (
    <View style={styles.container}>
      <Svg
        height={radius * 2}
        width={radius * 2}
        style={{ 
          transform: [{ rotate: `${rotationOffset}deg` }]
        }}
      >
        <Circle
          stroke={backgroundColor}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={`${visibleCircumference} ${totalCircumference}`}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        
        <Circle
          stroke={activeColor}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={`${visibleCircumference} ${totalCircumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        <G 
          origin={`${radius}, ${radius}`}
          rotation={dotRotation}
        >
          <Circle
            fill={thumbColor}
            r={strokeWidth / 2 - 2}
            cx={radius + normalizedRadius}
            cy={radius}
          />
        </G>
      </Svg>
      
      {showCenterText && (
        <View style={styles.centerText}>
          <View style={styles.textContainer}>
            <Text style={[styles.valueText, { color: centerTextColor, fontSize: centerTextSize }]}>
              {value}
            </Text>
            {showLabel && (
              <Text style={styles.labelText}>
                {labelText || `Step ${value}/${max}`}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  textContainer: {
    alignItems: 'center',
  },
  valueText: {
    fontWeight: 'bold',
  },
  labelText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});