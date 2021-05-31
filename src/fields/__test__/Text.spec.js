import React from 'react';
import { create, act } from 'react-test-renderer';
import Text from '../Text';

describe('Text', () => {
    it('renders an empty text block', async () => {
        // Arrange
        const props = {
            field: { text_formatted: [{ insert: '\n' }] },
            fieldValues: {},
            isFilled: false,
            displaySteps: [],
            submit: () => {},
            setElementKey: () => {},
            setRepeat: () => {}
        };

        // Act
        let text;
        act(() => {
            text = create(<Text {...props} />);
        });
        const tree = text.toJSON();

        // Assert
        expect(tree).toMatchSnapshot();
    });

    it('renders a plaintext text block', async () => {
        // Arrange
        const props = {
            field: { text_formatted: [{ insert: 'Hello World!' }] },
            fieldValues: {},
            isFilled: false,
            displaySteps: [],
            submit: () => {},
            setElementKey: () => {},
            setRepeat: () => {}
        };

        // Act
        let text;
        act(() => {
            text = create(<Text {...props} />);
        });
        const tree = text.toJSON();

        // Assert
        expect(tree).toMatchSnapshot();
    });

    it('renders a text block with custom styles', async () => {
        // Arrange
        const props = {
            field: {
                text_formatted: [
                    {
                        insert: 'Hello World!',
                        attributes: {
                            weight: 700,
                            color: '#000000FF',
                            size: '48px',
                            font: 'sans-serif',
                            italic: true,
                            strike: false,
                            underline: false
                        }
                    }
                ]
            },
            fieldValues: {},
            isFilled: false,
            displaySteps: [],
            submit: () => {},
            setElementKey: () => {},
            setRepeat: () => {}
        };

        // Act
        let text;
        act(() => {
            text = create(<Text {...props} />);
        });
        const tree = text.toJSON();

        // Assert
        expect(tree).toMatchSnapshot();
    });
});