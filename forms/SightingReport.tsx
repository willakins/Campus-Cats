import { Image, ScrollView, Text, View } from 'react-native';

import { doc } from 'firebase/firestore';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, Errorbar } from '@/components';
import { DefaultLocation } from '@/config/constants';
import { auth, db } from '@/config/firebase';
import { ControlledDateTimeInput, ControlledFilePicker, ControlledInput, ControlledMapPicker, ControlledSwitch } from './controls';
import { Sighting } from '@/models';
import { textStyles, containerStyles, buttonStyles } from '@/styles';
import { LatLngSchema } from '@/types';
import { uploadFromURI } from '@/utils';
import { useState } from 'react';

const reportSchema = z.object({
  name: z.string(),
  location: LatLngSchema.default(DefaultLocation),
  notes: z.string(),
  files: z.array(z.string()),
  timestamp: z.date().default(new Date()),
  fed: z.boolean().default(false),
  health: z.boolean().default(false),
});

type ReportDataType = z.infer<typeof reportSchema>;

const sightingFormConverter = async (data: ReportDataType): Promise<Sighting> => {
  // Upload all files to storage and get their refs
  const sightingStoragePath = 'photos/';
  const uploadPromises = data.files.map((file) => uploadFromURI(sightingStoragePath, file));
  // TODO: Instead of fullPath, switch to using name (uuid) so that we can
  // survive renaming the folder
  const storageUrls = (await Promise.all(uploadPromises)).map((upload) => upload.ref.fullPath);
  // TODO: It's possible that the upload could succeed but the DB write could
  // fail. Handle this case.

  // Get current user
  const userRef = auth.currentUser ? doc(db, 'users', auth.currentUser.uid) : null;

  // Transform the data to match Sighting schema
  const sightingData: Sighting = {
    id: null,
    user: userRef,
    name: data.name,
    spotted_time: data.timestamp,
    image: storageUrls[0],
    latitude: data.location.latitude,
    longitude: data.location.longitude,
    info: data.notes,
    fed: data.fed,
    health: data.health,
  };

  return Sighting.parse(sightingData);
}

const sightingConverter = (data: Sighting): ReportDataType => {
  return {
    name: data.name || '',
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
    },
    notes: data.info || '',
    files: [],
    timestamp: data.spotted_time || new Date(),
    fed: data.fed,
    health: data.health,
  };
};

type ReportFormProps = {
  type: 'create' | 'edit';
  onSubmit: (data: Sighting) => Promise<void>;
  onDelete?: () => Promise<void>;
  imageURL?: string,
  defaultValues?: Sighting;
};

export const SightingReportForm: React.FC<ReportFormProps> = ({
  type,
  onSubmit,
  onDelete,
  imageURL,
  defaultValues,
}) => {
  const [error, setError] = useState<string>('');

  const { handleSubmit, control } = useForm<ReportDataType>({
    resolver: zodResolver(reportSchema),
    defaultValues: (!!defaultValues) ? sightingConverter(defaultValues) : {},
  });

  const submitHandler = async (data: ReportDataType) => {
    try {
      const parsedData = await sightingFormConverter(data);
      await onSubmit(parsedData);
    } catch (err: unknown) {
      console.error('Error during upload:', err);
      setError(`Upload failed: ${(err as Error).message}`);
    }
  };

  const onInvalid = (errors: any) => {
    console.log('Form submission errors:', errors);
    setError('There are errors in your form. Please check and try again.');
  };

  return (
    <>
      <Button style={buttonStyles.editButton} onPress={handleSubmit(submitHandler, onInvalid)}>
        <Text style= {textStyles.editText}>
          {type === 'create' ? 'Submit Sighting' : null}
          {type === 'edit' ? 'Save' : null}
        </Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <View style={containerStyles.container}>
          <Text style={textStyles.catalogTitle}>
            {type === 'create' ? 'Report A Sighting' : null}
            {type === 'edit' ? 'Edit A Sighting' : null}
          </Text>
          {type === 'edit' ? (imageURL
            ? (<Image source={{ uri: imageURL }} style={containerStyles.catImage} resizeMode='contain'/>)
            : (<Text style={containerStyles.catImage}>Loading image...</Text>)
          ): null}
          <View style={containerStyles.inputContainer}>
            <ControlledMapPicker control={control} name="location" />
            <ControlledDateTimeInput control={control} name="timestamp" />
            <ControlledInput control={control} name="name"
              placeholder="Cat's name"
              placeholderTextColor="#888"
              style={textStyles.input}
            />
            <ControlledInput control={control} name="notes"
              placeholder="Additional Notes"
              placeholderTextColor="#888"
              style={textStyles.input}
            />
            <ControlledFilePicker control={control} name="files" />
            <ControlledSwitch control={control} name="fed" label="Has been fed" />
            <ControlledSwitch control={control} name="health" label="Is in good health" />
          </View>
        </View>
        {onDelete ? <Button onPress={onDelete}>
          Delete
        </Button> : null}
      </ScrollView>
      <Errorbar error={error} onDismiss={() => setError('')} />
    </>
  );
};
