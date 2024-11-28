import { ChakraProvider } from '@chakra-ui/react'
import TitleBar from '../components/TitleBar'
import theme from '../lib/theme'
import { AppProps } from 'next/app'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <TitleBar />
      <Component {...pageProps} />
    </ChakraProvider>
  )
}

export default MyApp
