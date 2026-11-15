import React from 'react';
import GeneratingLoader from './GeneratingLoader';

const PracticeGenerationLoader = (props) => {
  return (
    <GeneratingLoader
      title="Generating your practice questions"
      subtitle="Please wait while your personalized questions are prepared."
      ariaLabel="Generating practice questions"
      {...props}
    />
  );
};

export default PracticeGenerationLoader;
