import React, { useState, useEffect, useCallback } from 'react';
import { Anchor, Grommet, Box, TextArea, Text, Paragraph, Image, Button, Footer } from 'grommet';
import { Like, Dislike, Github, Medium } from 'grommet-icons';
// import Spinner from "./components/Spinner";
import uuid from 'react-uuid'; // for generating session and recommendation UUIDS.
import RobotImage from './bartender-robot.svg';

const theme = {
  global: {
    font: {
      family: 'Roboto Mono',
      size: '18px',
      height: '20px',
    },
    input: {
      font: {
        size:  'medium',
        weight: '400'
      }
    },
    focus: {
      border: { color: '#4f5de6' }
    }
  },
  paragraph: {
    font: {
      family: 'Libre Baskerville'
    }
  }
};

const MainTitle = (props) => (
  <Text
    color='#4f5de6'
    size='xxlarge'
    textAlign='center'
    margin={{ top: 'large' }}
    {...props}
  />
);

const SubTitle = (props) => (
  <Text
    color='#878787'
    size='medium'
    textAlign='center'
    margin={{ bottom: 'medium' }}
    {...props}
  />
);

const MainText = (props) => (
  <Paragraph
    size='medium'
    textAlign='center'
    {...props}
  />
);

const MainButton = ({ inputText, handleClick, recommendationReady, props}) => {
  let isDisabled = false;
  let isLoading = false;
  if (!inputText) {
    // disable button if there's no user input yet
    isDisabled = true;
  }
  if (recommendationReady == false) {
    isLoading = true;
  }
  // TO DO: Replace "Loading..." text with spinner icon
  return (
  <Button
    primary
    fill
    disabled={isDisabled}
    color='#4f5de6'
    fill={true}
    label={ isLoading ? 'Loading...' : 'Generate cocktail' }
    onClick={handleClick}
    {...props}
  />
  )
};

const Output = ({ drinkRecommendation, userRating, handleLike, handleDislike }) => {
  if (!drinkRecommendation) {
    return null;
  } else {
    return (
      <Box flex alignSelf='center' align='center' animation='slideDown' width='large'>
        <Text margin={{ top: 'medium', bottom: 'none' }}>
          {drinkRecommendation}
        </Text>
        <Box flex direction='row' gap='small'>
          <Paragraph>What do you think?</Paragraph>
          <Button
            hoverIndicator={true}
            focusIndicator={false}
            onClick={handleLike}
            icon=<Like color={userRating == 'liked' ? '#4f5de6' : '#adb3f5'} />
          />
          <Button
            hoverIndicator={true}
            focusIndicator={false}
            onClick={handleDislike}
            icon=<Dislike  color={userRating == 'disliked' ? '#4f5de6' : '#adb3f5'} />
          />
        </Box>
      </Box>
    )
  }
}

 // make responsive?
function App() {
  const [sessionUUID, setSessionUUID] = useState(null);
  const [recommendationUUID, setRecommendationUUID] = useState(null);
  const [inputText, setInputText] = useState(null);
  const [recommendationReady, setRecommendationReady] = useState(null);
  const [drinkRecommendation, setDrinkRecommendation] = useState(null);
  const [userRating, setUserRating] = useState(null);

  // const API_URL = 'http://localhost:3001'; // for testing
  const API_URL = 'https://cocktail-creator-backend.herokuapp.com'; // for production

  // initialize a session every time the page loads
  useEffect(() => {
    if (!sessionUUID) {
      setSessionUUID(uuid());
    }
  }, [sessionUUID]);

  // get cocktail recommmendation from GPT-3 API
  const getServerResponse = useCallback(async (drinkRequest, sessionUUID, newRecommendationUUID) => {
    const response = await fetch(
      API_URL + '/recommendation',
      { headers: {
          prompt: drinkRequest,
          sessionUUID: sessionUUID,
          recommendationUUID: newRecommendationUUID
        } }
    );
    const output = await response.text();
    setDrinkRecommendation(output);
    setRecommendationReady(true);
  }, []);

  // send user rating to server so we can save to DB
  const saveUserRating = useCallback(async (recommendationUUID, rating) => {
    const response = await fetch(
      API_URL + '/rating',
      { headers: {
          recommendationUUID: recommendationUUID,
          rating: rating
        } }
    );
    console.log(response);
  }, []);

  const handleInput = ((event) => {
    setInputText(event.target.value);
  });

  const handleClick = (() => {
    // reset values if this isn't the first click
    setUserRating(null);
    setDrinkRecommendation(null);

    // trigger loading behavior in UI
    setRecommendationReady(false);

    // get a new recommendation from GPT-3
    const newRecommendationUUID = uuid();
    setRecommendationUUID(newRecommendationUUID);
    getServerResponse(inputText, sessionUUID, newRecommendationUUID);
  });

  const handleRating = ((rating) => {
    setUserRating(rating);
    saveUserRating(recommendationUUID, rating);
  });

  const handleLike = (() => {
    handleRating("liked");
  });

  const handleDislike = (() => {
    handleRating("disliked");
  });

  return (
    <Grommet theme={theme}>
      <Box fill pad={{ horizontal: 'medium' }}>
         <Box flex align='center'>
           <MainTitle>Backend Bartender</MainTitle>
           <SubTitle>AI-Inspired Cocktails</SubTitle>
         </Box>
         <Box flex align='center' height='150px'>
           <Image fill='vertical' src={RobotImage} />
         </Box>
         <Box flex align='center'>
            <MainText>
              <Anchor
                color='#9c9cf4'
                href='https://www.nytimes.com/2020/11/24/science/artificial-intelligence-ai-gpt3.html'
                target='_blank'
              >
                GPT-3
              </Anchor> is
              the bleeding edge of artificial intelligence.
              It can hold conversations, author essays, and write code.
              But can it mix a decent drink?
            </MainText>
            <MainText>
            Describe a cocktail,
            and GPT-3 will invent a brand new recipe just for you.
            </MainText>
         </Box>
         <Box direction='column' flex width='medium'
              alignSelf='center' gap='medium'
          >
            <TextArea
              resize={false}
              focusIndicator={true}
              placeholder='Example: "a rum cocktail with fruit juice"'
              onChange={handleInput}
            />
              <MainButton
                inputText={inputText}
                handleClick={() => handleClick()}
                recommendationReady={recommendationReady}
              />
         </Box>
         <Output
            drinkRecommendation={drinkRecommendation}
            userRating={userRating}
            handleLike={() => handleLike()}
            handleDislike={() => handleDislike()}
            handleRating={(rating) => handleRating(rating)}
         />
         <Footer flex alignSelf='center' margin={{ top: 'xlarge' }} gap='xsmall'>
            <Paragraph size='small'>Built by Abhi Reddy</Paragraph>
             <Button href='https://github.com/abhireddy/' target='_blank'><Github /></Button>
             <Button href='https://medium.com/swlh/gpt-3-invented-cocktails-you-might-actually-want-to-try-e42783a58195' target='_blank'><Medium /></Button>
         </Footer>
      </Box>
    </Grommet>
  );
}

    // onClick={() => handleClick()}
    // <MainButton
    //   inputText={inputText}
    //   onClick={() => handleClick()}
    // />

export default App;
